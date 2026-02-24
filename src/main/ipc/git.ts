import { ipcMain } from 'electron'
import { execSync } from 'child_process'
import store from '../store'

function getRepoPath(): string {
  const repoPath = store.get('repoPath')
  if (!repoPath) {
    throw new Error('Repository path not configured')
  }
  return repoPath
}

function execGit(command: string, cwd: string): string {
  return execSync(command, { cwd, encoding: 'utf-8' }).trim()
}

export function registerGitHandlers(): void {
  ipcMain.handle('git:branch', async () => {
    const cwd = getRepoPath()
    return execGit('git rev-parse --abbrev-ref HEAD', cwd)
  })

  ipcMain.handle('git:branches', async () => {
    const cwd = getRepoPath()
    const output = execGit("git branch --format='%(refname:short)'", cwd)
    return output
      .split('\n')
      .map((b) => b.replace(/^'|'$/g, '').trim())
      .filter(Boolean)
  })

  ipcMain.handle('git:switch', async (_event, branch: string) => {
    const cwd = getRepoPath()
    try {
      execGit(`git checkout ${branch}`, cwd)

      // If switching to main, run bun install
      if (branch === 'main') {
        execSync('bun install', { cwd, encoding: 'utf-8' })
      }

      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('git:status', async () => {
    const cwd = getRepoPath()
    const output = execGit('git status --porcelain', cwd)
    const files = output
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)

    return {
      clean: files.length === 0,
      files
    }
  })

  ipcMain.handle('git:remote-status', async () => {
    const cwd = getRepoPath()
    try {
      execGit('git fetch origin', cwd)

      const behindStr = execGit('git rev-list --count HEAD..origin/main', cwd)
      const aheadStr = execGit('git rev-list --count origin/main..HEAD', cwd)

      return {
        behind: parseInt(behindStr, 10) || 0,
        ahead: parseInt(aheadStr, 10) || 0
      }
    } catch (err) {
      return { behind: 0, ahead: 0, error: (err as Error).message }
    }
  })

  ipcMain.handle('git:pull', async () => {
    const cwd = getRepoPath()
    try {
      execGit('git pull origin main', cwd)
      return { success: true, conflict: false }
    } catch (err) {
      const message = (err as Error).message
      const conflict = message.includes('CONFLICT') || message.includes('merge conflict')
      return { success: false, conflict }
    }
  })

  ipcMain.handle('git:hard-reset', async () => {
    const cwd = getRepoPath()
    try {
      const currentBranch = execGit('git rev-parse --abbrev-ref HEAD', cwd)

      // Stash any tracked changes (ignore error if nothing to stash)
      try { execGit('git stash --include-untracked', cwd) } catch { /* nothing to stash */ }

      // If not on main, switch to main
      if (currentBranch !== 'main') {
        execGit('git checkout main', cwd)
      }

      // Nuke everything: tracked changes AND untracked files/dirs
      execGit('git reset --hard origin/main', cwd)
      execGit('git clean -fd', cwd)

      // Pull latest
      execGit('git pull origin main', cwd)

      // Drop the stash we just made (don't care if it fails)
      try { execGit('git stash drop', cwd) } catch { /* no stash */ }

      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('git:stage-and-commit', async (_event, { message }: { message: string }) => {
    const cwd = getRepoPath()
    try {
      execGit('git add -A', cwd)
      execGit(`git commit -m "${message.replace(/"/g, '\\"')}"`, cwd)
      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('git:create-branch', async (_event, { name }: { name: string }) => {
    const cwd = getRepoPath()
    try {
      execGit(`git checkout -b ${name}`, cwd)
      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('git:create-pr', async (_event, { title, body }: { title: string; body: string }) => {
    const cwd = getRepoPath()
    try {
      // Push current branch to remote first
      const branch = execGit('git rev-parse --abbrev-ref HEAD', cwd)
      execGit(`git push -u origin ${branch}`, cwd)

      const escapedTitle = title.replace(/"/g, '\\"')
      const escapedBody = body.replace(/"/g, '\\"')
      const output = execSync(
        `gh pr create --title "${escapedTitle}" --body "${escapedBody}"`,
        { cwd, encoding: 'utf-8' }
      ).trim()
      // gh pr create outputs the PR URL as the last line
      const lines = output.split('\n')
      const url = lines[lines.length - 1].trim()
      return { success: true, url }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })
}
