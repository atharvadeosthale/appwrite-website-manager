import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { execSync, spawn, ChildProcess } from 'child_process'
import { appendFileSync, existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { fixPath } from '../utils/fixPath'

interface PrerequisiteStatus {
  id: 'git' | 'node' | 'bun' | 'gh' | 'claude'
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
  event: IpcMainInvokeEvent,
  extraEnv?: Record<string, string>
): Promise<{ success: boolean; error?: string; output?: string }> {
  return new Promise((resolve) => {
    let output = ''

    const proc = spawn(command, args, {
      shell: true,
      env: { ...process.env, ...extraEnv }
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

/** Resolve the absolute path to the brew binary (Apple Silicon vs Intel) */
function resolveBrew(): string {
  if (existsSync('/opt/homebrew/bin/brew')) return '/opt/homebrew/bin/brew'
  if (existsSync('/usr/local/bin/brew')) return '/usr/local/bin/brew'
  return 'brew' // fallback to PATH lookup
}

/**
 * Run a shell command with elevated (root) privileges on macOS.
 * Shows the native macOS authentication dialog ("wants to make changes").
 * Output is returned after completion (not streamed).
 */
function runElevated(
  shellCommand: string,
  event: IpcMainInvokeEvent
): Promise<{ success: boolean; error?: string; output?: string }> {
  return new Promise((resolve) => {
    const escaped = shellCommand.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    const proc = spawn('osascript', [
      '-e',
      `do shell script "${escaped}" with administrator privileges`
    ])

    let output = ''

    proc.stdout?.on('data', (data: Buffer) => {
      const chunk = data.toString()
      output += chunk
      event.sender.send('setup:output', chunk)
    })

    proc.stderr?.on('data', (data: Buffer) => {
      const chunk = data.toString()
      // osascript prints errors to stderr — only forward non-osascript noise
      if (!chunk.includes('execution error')) {
        event.sender.send('setup:output', chunk)
      }
      output += chunk
    })

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, output })
      } else {
        resolve({
          success: false,
          error: output.includes('User canceled')
            ? 'Authentication was cancelled'
            : `Elevated command failed (exit ${code})`,
          output
        })
      }
    })

    proc.on('error', (err) => {
      resolve({ success: false, error: err.message, output })
    })
  })
}

/**
 * Ensure the Homebrew prefix directory exists and is owned by the current user.
 * On Apple Silicon this is /opt/homebrew which requires root to create.
 * Uses the native macOS password dialog so the user never touches a terminal.
 * If the directory already exists and is writable, this is a no-op.
 */
async function ensureBrewPrefix(
  event: IpcMainInvokeEvent
): Promise<{ success: boolean; error?: string }> {
  const prefix = process.arch === 'arm64' ? '/opt/homebrew' : '/usr/local/Homebrew'

  // Already exists — no elevation needed
  if (existsSync(prefix)) return { success: true }

  const user = process.env.USER || 'nobody'
  event.sender.send('setup:output', 'Requesting administrator access to set up Homebrew...\n')

  return runElevated(
    `mkdir -p ${prefix} && chown -R ${user}:admin ${prefix}`,
    event
  )
}

/**
 * After Homebrew installs on Apple Silicon, it lives at /opt/homebrew
 * and is NOT on PATH until the user adds `eval "$(/opt/homebrew/bin/brew shellenv)"`
 * to their shell profile. This function:
 * 1. Appends the eval line to ~/.zprofile (if not already present)
 * 2. Runs brew shellenv and applies it to process.env so the current session works
 * 3. Calls fixPath() as a final fallback
 */
function setupBrewPath(): void {
  const home = process.env.HOME || ''
  const brewBin = resolveBrew()

  // If brew doesn't exist at a known path, just fixPath and hope
  if (brewBin === 'brew') {
    fixPath()
    return
  }

  // 1. Persist to ~/.zprofile so the user's terminal works too
  const zprofile = join(home, '.zprofile')
  const shellenvLine = `eval "$(${brewBin} shellenv)"`
  try {
    const existing = existsSync(zprofile) ? readFileSync(zprofile, 'utf-8') : ''
    if (!existing.includes('brew shellenv')) {
      appendFileSync(zprofile, `\n${shellenvLine}\n`)
    }
  } catch {
    // Non-critical — PATH will still work via fixPath
  }

  // 2. Apply brew shellenv to current process.env
  try {
    const shellenv = execSync(`${brewBin} shellenv`, { encoding: 'utf-8' })
    for (const line of shellenv.split('\n')) {
      const match = line.match(/^export\s+(\w+)="(.+)"/)
      if (match) {
        process.env[match[1]] = match[2].replace(/\$\{(\w+)\+:(\$\1)\}/g, (_m, name) => {
          return process.env[name] ? `:${process.env[name]}` : ''
        })
      }
    }
  } catch {
    // Fall through to fixPath
  }

  fixPath()
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

    // claude
    const claudeRaw = tryExecSync('claude -v')
    if (claudeRaw) {
      const version = parseVersion(claudeRaw)
      prerequisites.push({ id: 'claude', installed: true, version })
    } else {
      prerequisites.push({ id: 'claude', installed: false })
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

  ipcMain.handle('setup:install-git', async (event) => {
    try {
      if (process.platform === 'darwin') {
        // Triggers the native Apple dialog to install Xcode Command Line Tools (includes git)
        // This is fire-and-forget — the OS handles the install UI
        spawn('xcode-select', ['--install'])
        return { success: true, output: 'Xcode Command Line Tools installer launched. Follow the Apple prompt to complete installation, then click Re-check.' }
      } else if (process.platform === 'win32') {
        const result = await spawnWithStreaming(
          'winget',
          ['install', '--id', 'Git.Git', '--accept-package-agreements', '--accept-source-agreements'],
          event
        )
        if (result.success) fixPath()
        return result
      } else {
        return { success: false, error: `Unsupported platform: ${process.platform}` }
      }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('setup:install-node', async (event) => {
    try {
      if (process.platform === 'darwin') {
        const brewAvailable = tryExecSync('which brew') !== null
        if (!brewAvailable) {
          // Ensure /opt/homebrew exists (shows native password dialog if needed)
          const prefixResult = await ensureBrewPrefix(event)
          if (!prefixResult.success) return prefixResult

          // Install Homebrew (NONINTERACTIVE skips "Press RETURN" prompt)
          // sudo is no longer needed because we pre-created the prefix directory
          event.sender.send('setup:output', 'Installing Homebrew...\n')
          const brewResult = await spawnWithStreaming(
            'bash',
            ['-c', 'curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh | bash'],
            event,
            { NONINTERACTIVE: '1' }
          )
          if (!brewResult.success) return brewResult
          setupBrewPath()
        }
        const brewPath = resolveBrew()
        const result = await spawnWithStreaming(brewPath, ['install', 'node'], event)
        if (result.success) fixPath()
        return result
      } else if (process.platform === 'win32') {
        const result = await spawnWithStreaming(
          'winget',
          ['install', '--id', 'OpenJS.NodeJS.LTS', '--accept-package-agreements', '--accept-source-agreements'],
          event
        )
        if (result.success) fixPath()
        return result
      } else {
        return { success: false, error: `Unsupported platform: ${process.platform}` }
      }
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
        const brewAvailable = tryExecSync('which brew') !== null
        if (!brewAvailable) {
          // Ensure /opt/homebrew exists (shows native password dialog if needed)
          const prefixResult = await ensureBrewPrefix(event)
          if (!prefixResult.success) return prefixResult

          // Install Homebrew (NONINTERACTIVE skips "Press RETURN" prompt)
          // sudo is no longer needed because we pre-created the prefix directory
          event.sender.send('setup:output', 'Installing Homebrew...\n')
          const brewResult = await spawnWithStreaming(
            'bash',
            ['-c', 'curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh | bash'],
            event,
            { NONINTERACTIVE: '1' }
          )
          if (!brewResult.success) return brewResult
          setupBrewPath()
        }
        const brewPath = resolveBrew()
        const result = await spawnWithStreaming(brewPath, ['install', 'gh'], event)
        if (result.success) fixPath()
        return result
      } else if (process.platform === 'win32') {
        const result = await spawnWithStreaming(
          'winget',
          ['install', '--id', 'GitHub.cli', '--accept-package-agreements', '--accept-source-agreements'],
          event
        )
        if (result.success) fixPath()
        return result
      } else {
        return { success: false, error: `Unsupported platform: ${process.platform}` }
      }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('setup:install-claude', async (event) => {
    try {
      let result: { success: boolean; error?: string; output?: string }

      if (process.platform === 'darwin' || process.platform === 'linux') {
        result = await spawnWithStreaming(
          'bash',
          ['-c', 'curl -fsSL https://claude.ai/install.sh | bash'],
          event
        )
      } else if (process.platform === 'win32') {
        event.sender.send('setup:output', 'Installing Claude Code via PowerShell...\n')
        result = await spawnWithStreaming(
          'powershell',
          [
            '-NoProfile',
            '-ExecutionPolicy',
            'Bypass',
            '-Command',
            'irm https://claude.ai/install.ps1 | iex'
          ],
          event
        )

        if (!result.success) {
          event.sender.send('setup:output', 'PowerShell install failed, trying CMD installer...\n')
          result = await spawnWithStreaming(
            'cmd',
            ['/c', 'curl -fsSL https://claude.ai/install.cmd -o install.cmd && install.cmd && del install.cmd'],
            event
          )
        }
      } else {
        return { success: false, error: `Unsupported platform: ${process.platform}` }
      }

      if (result.success) fixPath()
      return result
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('setup:install-all', async (event) => {
    try {
      // 1. Check what's already installed
      const nodeInstalled = tryExecSync('node -v') !== null
      const bunInstalled = tryExecSync('bun -v') !== null
      const ghInstalled = tryExecSync('gh --version') !== null
      const claudeInstalled = tryExecSync('claude -v') !== null

      const needsBrew = process.platform === 'darwin' && (!nodeInstalled || !ghInstalled)
      const brewAvailable = tryExecSync('which brew') !== null

      // 2. Request sudo upfront ONLY if we need brew and it's not installed yet
      if (needsBrew && !brewAvailable) {
        const prefixResult = await ensureBrewPrefix(event)
        if (!prefixResult.success) return prefixResult

        event.sender.send('setup:output', 'Installing Homebrew...\n')
        const brewResult = await spawnWithStreaming(
          'bash',
          ['-c', 'curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh | bash'],
          event,
          { NONINTERACTIVE: '1' }
        )
        if (!brewResult.success) return brewResult
        setupBrewPath()
      }

      // 3. Install each missing tool sequentially
      if (!nodeInstalled) {
        event.sender.send('setup:output', '\n── Installing Node.js ──\n')
        if (process.platform === 'darwin') {
          const brewPath = resolveBrew()
          const result = await spawnWithStreaming(brewPath, ['install', 'node'], event)
          if (!result.success) return result
          fixPath()
        } else if (process.platform === 'win32') {
          const result = await spawnWithStreaming(
            'winget',
            ['install', '--id', 'OpenJS.NodeJS.LTS', '--accept-package-agreements', '--accept-source-agreements'],
            event
          )
          if (!result.success) return result
          fixPath()
        }
      }

      if (!bunInstalled) {
        event.sender.send('setup:output', '\n── Installing Bun ──\n')
        if (process.platform === 'darwin') {
          const result = await spawnWithStreaming(
            'bash',
            ['-c', 'curl -fsSL https://bun.sh/install | bash'],
            event
          )
          if (!result.success) return result
          fixPath()
        } else if (process.platform === 'win32') {
          const result = await spawnWithStreaming(
            'powershell',
            ['-c', 'irm bun.sh/install.ps1|iex'],
            event
          )
          if (!result.success) return result
          fixPath()
        }
      }

      if (!ghInstalled) {
        event.sender.send('setup:output', '\n── Installing GitHub CLI ──\n')
        if (process.platform === 'darwin') {
          const brewPath = resolveBrew()
          const result = await spawnWithStreaming(brewPath, ['install', 'gh'], event)
          if (!result.success) return result
          fixPath()
        } else if (process.platform === 'win32') {
          const result = await spawnWithStreaming(
            'winget',
            ['install', '--id', 'GitHub.cli', '--accept-package-agreements', '--accept-source-agreements'],
            event
          )
          if (!result.success) return result
          fixPath()
        }
      }

      if (!claudeInstalled) {
        event.sender.send('setup:output', '\n── Installing Claude Code ──\n')
        if (process.platform === 'darwin' || process.platform === 'linux') {
          const result = await spawnWithStreaming(
            'bash',
            ['-c', 'curl -fsSL https://claude.ai/install.sh | bash'],
            event
          )
          if (!result.success) return result
          fixPath()
        } else if (process.platform === 'win32') {
          let result = await spawnWithStreaming(
            'powershell',
            [
              '-NoProfile',
              '-ExecutionPolicy',
              'Bypass',
              '-Command',
              'irm https://claude.ai/install.ps1 | iex'
            ],
            event
          )
          if (!result.success) {
            event.sender.send(
              'setup:output',
              'PowerShell install failed, trying CMD installer...\n'
            )
            result = await spawnWithStreaming(
              'cmd',
              [
                '/c',
                'curl -fsSL https://claude.ai/install.cmd -o install.cmd && install.cmd && del install.cmd'
              ],
              event
            )
          }
          if (!result.success) return result
          fixPath()
        } else {
          return { success: false, error: `Unsupported platform: ${process.platform}` }
        }
      }

      event.sender.send('setup:output', '\n── All tools installed successfully ──\n')
      return { success: true }
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
