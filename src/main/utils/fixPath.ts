import { execSync } from 'child_process'

// Fix PATH for packaged app — Finder doesn't inherit the user's shell PATH
// so bun, npx, git, gh etc. won't be found without this
export function fixPath(): void {
  const home = process.env.HOME || ''
  // Always add common tool locations
  const extraPaths = [
    `${home}/.local/bin`,
    `${home}/.bun/bin`,
    '/opt/homebrew/bin',
    '/opt/homebrew/sbin',
    '/usr/local/bin',
    '/usr/local/sbin',
    `${home}/.nvm/versions/node`,
    `${home}/.volta/bin`,
    `${home}/.cargo/bin`
  ]

  // Try to get the real PATH from user's login shell using markers
  // so we can extract it cleanly even if the shell prints extra output
  try {
    const userShell = process.env.SHELL || '/bin/zsh'
    const marker = `__PATH_${Date.now()}__`
    const output = execSync(
      `${userShell} -lc 'echo "${marker}$PATH${marker}"'`,
      { encoding: 'utf-8', timeout: 5000 }
    )
    const match = output.match(new RegExp(`${marker}(.+?)${marker}`))
    if (match && match[1]) {
      // Even when shell PATH resolves, keep guaranteed tool paths merged in.
      const merged = new Set([...match[1].split(':'), ...extraPaths])
      process.env.PATH = [...merged].filter(Boolean).join(':')
      return
    }
  } catch {
    // Shell failed, use fallback
  }

  // Fallback: merge extra paths into whatever PATH we have
  const current = process.env.PATH || '/usr/bin:/bin:/usr/sbin:/sbin'
  const merged = new Set([...current.split(':'), ...extraPaths])
  process.env.PATH = [...merged].filter(Boolean).join(':')
}
