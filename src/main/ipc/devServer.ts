import { ipcMain } from 'electron'
import { spawn, execSync, ChildProcess } from 'child_process'
import { createConnection } from 'net'
import store from '../store'

let devServerProcess: ChildProcess | null = null

function getRepoPath(): string {
  const repoPath = store.get('repoPath')
  if (!repoPath) {
    throw new Error('Repository path not configured')
  }
  return repoPath
}

function probePort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ port }, () => {
      socket.destroy()
      resolve(true)
    })

    socket.on('error', () => {
      resolve(false)
    })

    socket.setTimeout(1000, () => {
      socket.destroy()
      resolve(false)
    })
  })
}

function killPort(port: number): void {
  try {
    // Find and kill any process on this port
    const result = execSync(`lsof -ti:${port}`, { encoding: 'utf-8' }).trim()
    if (result) {
      const pids = result.split('\n').map((p) => p.trim()).filter(Boolean)
      for (const pid of pids) {
        try {
          execSync(`kill -9 ${pid}`)
        } catch {
          // Process may already be dead
        }
      }
    }
  } catch {
    // No process on port — that's fine
  }
}

export function registerDevServerHandlers(): void {
  ipcMain.handle('dev-server:start', async (event) => {
    if (devServerProcess) {
      return { success: false, error: 'Dev server is already running' }
    }

    // Check if port is already taken
    const portTaken = await probePort(5173)
    if (portTaken) {
      return { success: false, error: 'Port 5173 is already in use' }
    }

    const cwd = getRepoPath()

    try {
      devServerProcess = spawn('bun', ['run', 'dev'], {
        cwd,
        shell: true,
        env: { ...process.env }
      })

      devServerProcess.stdout?.on('data', (data: Buffer) => {
        event.sender.send('dev-server:output', data.toString())
      })

      devServerProcess.stderr?.on('data', (data: Buffer) => {
        event.sender.send('dev-server:output', data.toString())
      })

      devServerProcess.on('close', () => {
        devServerProcess = null
        event.sender.send('dev-server:stopped')
      })

      devServerProcess.on('error', (err) => {
        devServerProcess = null
        event.sender.send('dev-server:error', err.message)
      })

      return { success: true }
    } catch (err) {
      devServerProcess = null
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('dev-server:stop', async () => {
    // Kill our tracked process if we have one
    if (devServerProcess) {
      try {
        devServerProcess.kill('SIGTERM')
      } catch {
        // Ignore
      }
      devServerProcess = null
    }

    // Also kill anything on port 5173 to be thorough
    killPort(5173)

    return { success: true }
  })

  ipcMain.handle('dev-server:status', async () => {
    const running = await probePort(5173)
    return { running }
  })
}
