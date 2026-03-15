import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { spawn, execFile, execFileSync } from 'child_process'
import { existsSync } from 'fs'
import store from '../store'

function getRepoPath(): string {
  const repoPath = store.get('repoPath')
  if (!repoPath) {
    throw new Error('Repository path not configured')
  }
  return repoPath
}

// Resolve absolute path to bunx (preferred) or npx
// Lazy-resolved after fixPath() has run in index.ts
// We prefer bunx because the website repo uses bun, and npx/npm
// chokes on bun-specific overrides in the repo's package.json

let _runnerPath: string | null = null
let _runnerCmd: string = 'bunx'

function getRunner(): { cmd: string; path: string } {
  if (_runnerPath) return { cmd: _runnerCmd, path: _runnerPath }

  const home = process.env.HOME || ''

  // Try bunx first (preferred — website repo is a bun project)
  const bunxCandidates = [`${home}/.bun/bin/bunx`, '/opt/homebrew/bin/bunx', '/usr/local/bin/bunx']
  try {
    _runnerPath = execFileSync('/usr/bin/env', ['which', 'bunx'], {
      encoding: 'utf-8',
      env: process.env
    }).trim()
    _runnerCmd = 'bunx'
    return { cmd: _runnerCmd, path: _runnerPath }
  } catch {
    for (const c of bunxCandidates) {
      if (existsSync(c)) {
        _runnerPath = c
        _runnerCmd = 'bunx'
        return { cmd: _runnerCmd, path: _runnerPath }
      }
    }
  }

  // Fall back to npx
  const npxCandidates = [
    '/opt/homebrew/bin/npx',
    '/usr/local/bin/npx',
    `${home}/.nvm/versions/node/current/bin/npx`,
    `${home}/.volta/bin/npx`
  ]
  try {
    _runnerPath = execFileSync('/usr/bin/env', ['which', 'npx'], {
      encoding: 'utf-8',
      env: process.env
    }).trim()
    _runnerCmd = 'npx'
    return { cmd: _runnerCmd, path: _runnerPath }
  } catch {
    for (const c of npxCandidates) {
      if (existsSync(c)) {
        _runnerPath = c
        _runnerCmd = 'npx'
        return { cmd: _runnerCmd, path: _runnerPath }
      }
    }
  }

  _runnerPath = 'npx'
  _runnerCmd = 'npx'
  return { cmd: _runnerCmd, path: _runnerPath }
}

function getCliEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env }
  // Ensure bun is in PATH for child processes the CLI spawns (e.g. bun run optimize)
  const home = process.env.HOME || ''
  const bunDir = `${home}/.bun/bin`
  if (env.PATH && !env.PATH.includes(bunDir)) {
    env.PATH = `${bunDir}:${env.PATH}`
  }
  return env
}

function spawnCli(args: string[], cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const { path } = getRunner()
    const proc = spawn(path, ['appwrite-internal-cli', ...args], {
      cwd,
      shell: false,
      env: getCliEnv()
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
    const { path } = getRunner()
    const proc = spawn(path, ['appwrite-internal-cli', ...args], {
      cwd,
      shell: false,
      env: getCliEnv()
    })

    let output = ''

    proc.stdout.on('data', (data: Buffer) => {
      const chunk = data.toString()
      output += chunk
      try {
        if (!event.sender.isDestroyed()) {
          event.sender.send('cli:output', chunk)
        }
      } catch {
        // sender destroyed — ignore
      }
    })

    proc.stderr.on('data', (data: Buffer) => {
      const chunk = data.toString()
      output += chunk
      try {
        if (!event.sender.isDestroyed()) {
          event.sender.send('cli:output', chunk)
        }
      } catch {
        // sender destroyed — ignore
      }
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
        unlisted: boolean
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
      if (options.unlisted) args.push('--unlisted')

      args.push('--force')

      return spawnCliWithStreaming(args, cwd, event)
    }
  )

  ipcMain.handle(
    'cli:update-blog',
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
        unlisted: boolean
        cover?: string
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
      if (options.featured) args.push('--featured')
      if (options.unlisted) args.push('--unlisted')

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

  ipcMain.handle(
    'cli:write-with-ai',
    async (_event, { blogSlug, aiPrompt }: { blogSlug: string; aiPrompt: string }) => {
      const cwd = getRepoPath()
      const blogPath = `src/routes/blog/post/${blogSlug}/+page.markdoc`

      console.log('[write-with-ai] Handler invoked for blog:', blogSlug)
      console.log('[write-with-ai] CWD:', cwd)

      const prompt = [
        `Edit ${blogPath} based on the instructions below. If the instructions are asking to edit or improve specific parts of the existing blog, make those targeted edits while preserving the rest of the content. If the instructions are asking to write new content or a complete blog, write from scratch.`,
        `Do not touch any of the frontmatter. When writing or editing, you MUST follow the tone and format of other blogs in this repo.`,
        `The wording must be consistent in this blog.`,
        `Recommend checking out a few blogs of same domain if available, or any blogs to use similar wording and tone.`,
        `It's very important for us to be consistent with tone.`,
        `Do web searches when necessary to get more information.`,
        `If you need information about Appwrite, you can get info from docs/blogs in the same repo. Use local links not starting with appwrite.io. YOU MUST FOLLOW THE PATTERNS OTHER BLOGS FOLLOW. Only for discord you're allowed an appwrite.io link.`,
        `## Voice and tone`,
        `- **Direct and opinionated.** State positions clearly. Avoid hedging language like "it depends" without then explaining what it depends on.`,
        `- **Developer-first.** Write for engineers making real decisions. No fluff, no marketing speak.`,
        `- **Practical over theoretical.** Lead with the concrete problem, then the reasoning, then the solution.`,
        `- **No unnecessary superlatives.** Don't call things "amazing" or "powerful" — show why they matter.`,
        `## Post structure pattern`,
        `1. **Hook** — Open with the real problem or a common misconception. No preamble.`,
        `2. **Establish the cost** — Why this problem matters in practice.`,
        `3. **Break it down** — Use H2/H3 sections to cover each dimension clearly.`,
        `4. **Concrete guidance** — What to actually do. Be specific.`,
        `5. **Close with a combined CTA and resources section** — Merge "Moving forward" and "Resources" into one section. The heading must be specific to the post's topic (e.g. "Getting started with Appwrite Auth", not "Moving forward"). Only link to pages directly relevant to the post. Do not include generic links to the homepage, Discord, or GitHub unless nothing more specific exists.`,
        `## Formatting conventions`,
        `- Use \`**bold**\` for key terms and important callouts within paragraphs.`,
        `- Use bullet lists for enumerating capabilities, trade-offs, or steps — not for general prose.`,
        `- Avoid nested lists unless strictly necessary.`,
        `- Link to official docs for referenced features: e.g. \`[Appwrite Sites](/docs/products/sites)\`.`,
        `- Keep paragraphs short: 2-4 sentences as a rule.`,
        `- **No em dashes.** Do not use \`—\` anywhere. Rewrite the sentence to avoid it using a period, comma, or restructured clause.`,
        `- **Section headings must be specific and declarative.** Avoid vague closers like "Moving forward", "What this means", or "Where to go from here". Bad: "Moving forward". Good: "Getting started with Appwrite Storage".`,
        `## SEO guidelines`,
        `- **Headings:** Use the primary keyword in at least one H2. Headings should reflect real search queries developers type, not internal jargon.`,
        `- **Search intent:** Match the post type to intent. A "how to" post should answer a specific task. A comparison post should help the reader make a decision. Do not write a conceptual post when developers are searching for a tutorial.`,
        `- **Internal links:** Link to at least one other relevant Appwrite blog post or doc page from within the body, not just the closing section.`,
        `## Content guidelines`,
        `- **Appwrite context:** Posts often compare Appwrite to alternatives (Firebase, Vercel, Netlify, etc.) or explain how Appwrite solves a specific developer problem. Keep comparisons fair and factual.`,
        `- **Avoid lock-in anxiety:** When recommending Appwrite, acknowledge trade-offs rather than dismissing alternatives.`,
        `- **Use real examples:** Reference actual developer workflows (Git-based deployments, serverless functions, auth flows) rather than hypothetical use cases.`,
        `- **timeToRead:** Estimate roughly 200-250 words per minute. A 1,200-word post = ~5-6 min read.`,
        ``,
        aiPrompt
      ].join('\n\n')

      console.log('[write-with-ai] Prompt length:', prompt.length, 'chars')

      // Resolve the absolute path to `claude` so spawn() can find it
      // even when the packaged app has a limited PATH.
      let claudePath = 'claude'
      try {
        claudePath = execFileSync('/usr/bin/env', ['which', 'claude'], {
          encoding: 'utf-8',
          env: getCliEnv()
        }).trim()
        console.log('[write-with-ai] Resolved claude path:', claudePath)
      } catch {
        console.warn(
          '[write-with-ai] Could not resolve claude path via which, falling back to "claude"'
        )
      }

      // Use --allowedTools so Claude can read, edit, search, and run commands
      // without prompting for permission.  --permission-mode acceptEdits only
      // auto-approves file-edit permissions — Bash, WebFetch, etc. still prompt,
      // which hangs the non-interactive -p session because there is no TTY.
      const cliArgs = [
        '-p',
        prompt,
        '--allowedTools',
        'Edit,Write,Read,Bash,Glob,Grep,WebFetch',
        '--verbose'
      ]

      console.log('[write-with-ai] Spawning:', claudePath, cliArgs.slice(0, 3).join(' '), '...')

      // 10-minute timeout — AI blog generation can take a while, but should
      // never exceed this.  Prevents zombie processes if something hangs.
      const TIMEOUT_MS = 10 * 60 * 1000

      return new Promise((resolve) => {
        let resolved = false
        const safeResolve = (value: { success: boolean; output: string; error?: string }): void => {
          if (resolved) return
          resolved = true
          clearTimeout(timer)
          console.log(
            '[write-with-ai] Resolving with success:',
            value.success,
            value.error ? `error: ${value.error}` : ''
          )
          resolve(value)
        }

        let proc: ReturnType<typeof spawn>
        try {
          proc = spawn(claudePath, cliArgs, {
            cwd,
            shell: false,
            env: getCliEnv(),
            stdio: ['pipe', 'pipe', 'pipe']
          })
          console.log('[write-with-ai] Process spawned, pid:', proc.pid)
        } catch (spawnErr) {
          console.error('[write-with-ai] spawn() threw synchronously:', spawnErr)
          safeResolve({
            success: false,
            output: '',
            error: `Failed to spawn claude: ${spawnErr instanceof Error ? spawnErr.message : String(spawnErr)}`
          })
          return
        }

        // Close stdin immediately — we are not piping input
        proc.stdin?.end()

        // Safety timeout so the process doesn't hang forever
        const timer = setTimeout(() => {
          console.error('[write-with-ai] Timeout reached, killing process')
          proc.kill('SIGTERM')
          // Give it 5 seconds to clean up, then force kill
          setTimeout(() => {
            try {
              proc.kill('SIGKILL')
            } catch {
              /* already dead */
            }
          }, 5000)
          safeResolve({
            success: false,
            output,
            error: 'Claude process timed out after 10 minutes'
          })
        }, TIMEOUT_MS)

        let output = ''

        proc.stdout?.on('data', (data: Buffer) => {
          const chunk = data.toString()
          output += chunk
          console.log('[write-with-ai] stdout chunk:', chunk.length, 'bytes')
        })

        proc.stderr?.on('data', (data: Buffer) => {
          const chunk = data.toString()
          output += chunk
          console.log(
            '[write-with-ai] stderr chunk:',
            chunk.length,
            'bytes:',
            chunk.substring(0, 200)
          )
        })

        proc.on('close', (code, signal) => {
          console.log('[write-with-ai] Process closed — code:', code, 'signal:', signal)
          if (code === 0) {
            safeResolve({ success: true, output })
          } else {
            safeResolve({
              success: false,
              output,
              error: signal
                ? `Claude was killed by signal ${signal}`
                : `Claude exited with code ${code}`
            })
          }
        })

        proc.on('error', (err) => {
          console.error('[write-with-ai] Process error event:', err.message)
          safeResolve({ success: false, output, error: err.message })
        })
      })
    }
  )

  // Check whether Claude Code CLI is installed
  ipcMain.handle(
    'cli:check-claude',
    async (): Promise<{ installed: boolean; version?: string; error?: string }> => {
      return new Promise((resolve) => {
        execFile('claude', ['--version'], { env: getCliEnv() }, (err, stdout, stderr) => {
          if (err) {
            // ENOENT means the binary was not found on PATH
            if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
              resolve({ installed: false, error: 'Claude Code CLI not found on PATH' })
            } else {
              resolve({ installed: false, error: stderr?.trim() || err.message })
            }
            return
          }

          const version = (stdout || stderr || '').trim()
          resolve({ installed: true, version })
        })
      })
    }
  )

  // Open an external terminal window with `claude` running
  ipcMain.handle(
    'cli:open-terminal-login',
    async (): Promise<{ success: boolean; error?: string }> => {
      const platform = process.platform

      return new Promise((resolve) => {
        if (platform === 'darwin') {
          // macOS: use osascript to open Terminal.app and run `claude`
          const script = [
            'tell application "Terminal"',
            '  activate',
            '  do script "claude"',
            'end tell'
          ].join('\n')

          execFile('osascript', ['-e', script], { env: getCliEnv() }, (err) => {
            if (err) {
              resolve({ success: false, error: err.message })
            } else {
              resolve({ success: true })
            }
          })
        } else if (platform === 'win32') {
          // Windows: open a new cmd window with `claude` running
          const proc = spawn('cmd.exe', ['/c', 'start', 'cmd', '/k', 'claude'], {
            shell: false,
            detached: true,
            stdio: 'ignore',
            env: getCliEnv()
          })

          proc.on('error', (err) => {
            resolve({ success: false, error: err.message })
          })

          // Detach so the child doesn't block the app
          proc.unref()

          // Give it a moment to detect spawn errors, then assume success
          setTimeout(() => resolve({ success: true }), 500)
        } else {
          // Linux: try common terminal emulators in order of popularity
          const terminals: Array<{ cmd: string; args: string[] }> = [
            { cmd: 'gnome-terminal', args: ['--', 'claude'] },
            { cmd: 'konsole', args: ['-e', 'claude'] },
            { cmd: 'xfce4-terminal', args: ['-e', 'claude'] },
            { cmd: 'xterm', args: ['-e', 'claude'] }
          ]

          const tryTerminal = (index: number): void => {
            if (index >= terminals.length) {
              resolve({
                success: false,
                error:
                  'No supported terminal emulator found (tried gnome-terminal, konsole, xfce4-terminal, xterm)'
              })
              return
            }

            const { cmd, args } = terminals[index]
            const proc = spawn(cmd, args, {
              detached: true,
              stdio: 'ignore',
              env: getCliEnv()
            })

            proc.on('error', () => {
              // This terminal not available, try the next one
              tryTerminal(index + 1)
            })

            proc.unref()

            // If no error fires quickly, consider it a success
            setTimeout(() => resolve({ success: true }), 500)
          }

          tryTerminal(0)
        }
      })
    }
  )
}
