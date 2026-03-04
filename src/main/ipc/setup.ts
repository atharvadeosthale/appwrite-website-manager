import { ipcMain, shell, IpcMainInvokeEvent } from 'electron'
import { execSync, spawn, ChildProcess } from 'child_process'
import { fixPath } from '../utils/fixPath'

interface PrerequisiteStatus {
  id: 'git' | 'node' | 'bun' | 'gh'
  installed: boolean
  version?: string
  authenticated?: boolean
}

let ghAuthProcess: ChildProcess | null = null

function tryExecSync(command: string): string | null {
  try {
    return execSync(command, { encoding: 'utf-8', timeout: 10000 }).trim()
  } catch {
    return null
  }
}

function parseVersion(raw: string, prefix?: RegExp): string {
  if (prefix) {
    const match = raw.match(prefix)
    return match ? match[1] : raw.trim()
  }
  // Generic: extract first semver-like string
  const match = raw.match(/(\d+\.\d+[\w.-]*)/)
  return match ? match[1] : raw.trim()
}

function spawnWithStreaming(
  command: string,
  args: string[],
  event: IpcMainInvokeEvent
): Promise<{ success: boolean; error?: string; output?: string }> {
  return new Promise((resolve) => {
    let output = ''

    const proc = spawn(command, args, {
      shell: true,
      env: { ...process.env }
    })

    proc.stdout?.on('data', (data: Buffer) => {
      const chunk = data.toString()
      output += chunk
      event.sender.send('setup:output', chunk)
    })

    proc.stderr?.on('data', (data: Buffer) => {
      const chunk = data.toString()
      output += chunk
      event.sender.send('setup:output', chunk)
    })

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, output })
      } else {
        resolve({ success: false, error: `Process exited with code ${code}`, output })
      }
    })

    proc.on('error', (err) => {
      resolve({ success: false, error: err.message, output })
    })
  })
}

export function registerSetupHandlers(): void {
  ipcMain.handle('setup:check-all', async () => {
    const prerequisites: PrerequisiteStatus[] = []

    // git
    const gitRaw = tryExecSync('git --version')
    if (gitRaw) {
      const version = parseVersion(gitRaw, /git version (\S+)/)
      prerequisites.push({ id: 'git', installed: true, version })
    } else {
      prerequisites.push({ id: 'git', installed: false })
    }

    // node
    const nodeRaw = tryExecSync('node -v')
    if (nodeRaw) {
      const version = parseVersion(nodeRaw, /v?(\S+)/)
      prerequisites.push({ id: 'node', installed: true, version })
    } else {
      prerequisites.push({ id: 'node', installed: false })
    }

    // bun
    const bunRaw = tryExecSync('bun -v')
    if (bunRaw) {
      const version = parseVersion(bunRaw)
      prerequisites.push({ id: 'bun', installed: true, version })
    } else {
      prerequisites.push({ id: 'bun', installed: false })
    }

    // gh
    const ghRaw = tryExecSync('gh --version')
    if (ghRaw) {
      const version = parseVersion(ghRaw, /gh version (\S+)/)
      // Check authentication status
      const authRaw = tryExecSync('gh auth status')
      const authenticated = authRaw !== null
      prerequisites.push({ id: 'gh', installed: true, version, authenticated })
    } else {
      prerequisites.push({ id: 'gh', installed: false, authenticated: false })
    }

    const allPassed =
      prerequisites.every((p) => p.installed) &&
      (prerequisites.find((p) => p.id === 'gh')?.authenticated === true)

    return {
      allPassed,
      prerequisites,
      platform: process.platform
    }
  })

  ipcMain.handle('setup:install-git', async () => {
    try {
      if (process.platform === 'darwin') {
        spawn('xcode-select', ['--install'], { shell: true })
        return { success: true }
      } else if (process.platform === 'win32') {
        await shell.openExternal('https://git-scm.com/download/win')
        return { success: true }
      } else {
        return { success: false, error: `Unsupported platform: ${process.platform}` }
      }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('setup:install-node', async () => {
    try {
      await shell.openExternal('https://nodejs.org')
      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('setup:install-bun', async (event) => {
    try {
      let result: { success: boolean; error?: string; output?: string }

      if (process.platform === 'darwin') {
        result = await spawnWithStreaming(
          'bash',
          ['-c', 'curl -fsSL https://bun.sh/install | bash'],
          event
        )
      } else if (process.platform === 'win32') {
        result = await spawnWithStreaming(
          'powershell',
          ['-c', 'irm bun.sh/install.ps1|iex'],
          event
        )
      } else {
        return { success: false, error: `Unsupported platform: ${process.platform}` }
      }

      if (result.success) {
        fixPath()
      }

      return result
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('setup:install-gh', async (event) => {
    try {
      if (process.platform === 'darwin') {
        // Try brew first
        const brewAvailable = tryExecSync('which brew') !== null
        if (brewAvailable) {
          const result = await spawnWithStreaming('brew', ['install', 'gh'], event)
          if (result.success) {
            fixPath()
          }
          return result
        } else {
          await shell.openExternal('https://github.com/cli/cli/releases/latest')
          return { success: true }
        }
      } else if (process.platform === 'win32') {
        // Try winget first
        const wingetAvailable = tryExecSync('where winget') !== null
        if (wingetAvailable) {
          const result = await spawnWithStreaming(
            'winget',
            ['install', '--id', 'GitHub.cli'],
            event
          )
          if (result.success) {
            fixPath()
          }
          return result
        } else {
          await shell.openExternal('https://github.com/cli/cli/releases/latest')
          return { success: true }
        }
      } else {
        return { success: false, error: `Unsupported platform: ${process.platform}` }
      }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('setup:auth-gh', async (event) => {
    return new Promise<{ success: boolean; error?: string }>((resolve) => {
      try {
        ghAuthProcess = spawn('gh', ['auth', 'login', '--web', '-h', 'github.com'], {
          shell: true,
          env: { ...process.env }
        })

        ghAuthProcess.stdout?.on('data', (data: Buffer) => {
          const text = data.toString()
          event.sender.send('setup:output', text)

          const codeMatch = text.match(/one-time code:\s*([A-Z0-9]{4}-[A-Z0-9]{4})/i)
          if (codeMatch) {
            event.sender.send('setup:gh-code', codeMatch[1])
          }
        })

        ghAuthProcess.stderr?.on('data', (data: Buffer) => {
          const text = data.toString()
          event.sender.send('setup:output', text)

          const codeMatch = text.match(/one-time code:\s*([A-Z0-9]{4}-[A-Z0-9]{4})/i)
          if (codeMatch) {
            event.sender.send('setup:gh-code', codeMatch[1])
          }
        })

        ghAuthProcess.on('close', (code) => {
          ghAuthProcess = null
          if (code === 0) {
            resolve({ success: true })
          } else {
            resolve({ success: false, error: `gh auth exited with code ${code}` })
          }
        })

        ghAuthProcess.on('error', (err) => {
          ghAuthProcess = null
          resolve({ success: false, error: err.message })
        })
      } catch (err) {
        ghAuthProcess = null
        resolve({ success: false, error: (err as Error).message })
      }
    })
  })

  ipcMain.handle('setup:cancel-auth-gh', async () => {
    if (ghAuthProcess) {
      try {
        ghAuthProcess.kill('SIGTERM')
      } catch {
        // Process may already be dead
      }
      ghAuthProcess = null
    }
    return { success: true }
  })
}
