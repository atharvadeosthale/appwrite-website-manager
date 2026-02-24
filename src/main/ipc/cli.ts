import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { spawn } from 'child_process'
import store from '../store'

function getRepoPath(): string {
  const repoPath = store.get('repoPath')
  if (!repoPath) {
    throw new Error('Repository path not configured')
  }
  return repoPath
}

function spawnCli(args: string[], cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('npx', ['appwrite-internal-cli', ...args], {
      cwd,
      shell: false,
      env: { ...process.env }
    })

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (data: Buffer) => {
      stdout += data.toString()
    })

    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString()
    })

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(stdout)
      } else {
        reject(new Error(stderr || `CLI exited with code ${code}`))
      }
    })

    proc.on('error', (err) => {
      reject(err)
    })
  })
}

function spawnCliWithStreaming(
  args: string[],
  cwd: string,
  event: IpcMainInvokeEvent
): Promise<{ success: boolean; output: string; error?: string }> {
  return new Promise((resolve) => {
    const proc = spawn('npx', ['appwrite-internal-cli', ...args], {
      cwd,
      shell: false,
      env: { ...process.env }
    })

    let output = ''

    proc.stdout.on('data', (data: Buffer) => {
      const chunk = data.toString()
      output += chunk
      event.sender.send('cli:output', chunk)
    })

    proc.stderr.on('data', (data: Buffer) => {
      const chunk = data.toString()
      output += chunk
      event.sender.send('cli:output', chunk)
    })

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, output })
      } else {
        resolve({ success: false, output, error: `CLI exited with code ${code}` })
      }
    })

    proc.on('error', (err) => {
      resolve({ success: false, output, error: err.message })
    })
  })
}

export function registerCliHandlers(): void {
  // Data query handlers - collect stdout and parse JSON
  ipcMain.handle('cli:get-authors', async () => {
    const cwd = getRepoPath()
    const output = await spawnCli(['blog', 'get-authors'], cwd)
    return JSON.parse(output)
  })

  ipcMain.handle('cli:get-categories', async () => {
    const cwd = getRepoPath()
    const output = await spawnCli(['blog', 'get-categories'], cwd)
    return JSON.parse(output)
  })

  ipcMain.handle('cli:get-blogs', async () => {
    const cwd = getRepoPath()
    const output = await spawnCli(['blog', 'get-blogs'], cwd)
    return JSON.parse(output)
  })

  // Mutation handlers - stream output back via IPC event
  ipcMain.handle(
    'cli:create-author',
    async (
      event,
      options: {
        name: string
        slug: string
        role: string
        bio: string
        avatar?: string
        twitter?: string
        github?: string
        linkedin?: string
      }
    ) => {
      const cwd = getRepoPath()
      const args = [
        'blog',
        'create-author',
        '--name',
        options.name,
        '--slug',
        options.slug,
        '--role',
        options.role,
        '--bio',
        options.bio
      ]

      if (options.avatar) args.push('--avatar', options.avatar)
      if (options.twitter) args.push('--twitter', options.twitter)
      if (options.github) args.push('--github', options.github)
      if (options.linkedin) args.push('--linkedin', options.linkedin)

      args.push('--force')

      return spawnCliWithStreaming(args, cwd, event)
    }
  )

  ipcMain.handle(
    'cli:create-blog',
    async (
      event,
      options: {
        title: string
        slug: string
        description: string
        date: string
        timeToRead: number
        author: string
        category: string
        featured: boolean
        cover?: string
        importNotion?: string
      }
    ) => {
      const cwd = getRepoPath()
      const args = [
        'blog',
        'create-blog',
        '--title',
        options.title,
        '--slug',
        options.slug,
        '--description',
        options.description,
        '--date',
        options.date,
        '--time-to-read',
        String(options.timeToRead),
        '--author',
        options.author,
        '--category',
        options.category
      ]

      if (options.cover) args.push('--cover', options.cover)
      if (options.importNotion) args.push('--import-notion', options.importNotion)
      if (options.featured) args.push('--featured')

      args.push('--force')

      return spawnCliWithStreaming(args, cwd, event)
    }
  )

  ipcMain.handle('cli:import-notion', async (event, zip: string, slug: string) => {
    const cwd = getRepoPath()
    const args = ['blog', 'import-notion', '--zip', zip, '--slug', slug]
    return spawnCliWithStreaming(args, cwd, event)
  })

  ipcMain.handle('cli:sanitize', async (event, slug: string) => {
    const cwd = getRepoPath()
    const args = ['blog', 'sanitize', '--slug', slug]
    return spawnCliWithStreaming(args, cwd, event)
  })
}
