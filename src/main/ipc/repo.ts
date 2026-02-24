import { ipcMain, dialog } from 'electron'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import store from '../store'

export function registerRepoHandlers(): void {
  ipcMain.handle('repo:select-folder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select Appwrite Website Repository'
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    return result.filePaths[0]
  })

  ipcMain.handle('repo:validate', async (_event, path: string) => {
    try {
      // Check .git directory exists
      if (!existsSync(join(path, '.git'))) {
        return { valid: false, error: 'Not a git repository (.git directory not found)' }
      }

      // Check package.json exists and has correct name
      const packageJsonPath = join(path, 'package.json')
      if (!existsSync(packageJsonPath)) {
        return { valid: false, error: 'package.json not found' }
      }

      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
      if (packageJson.name !== 'appwrite-website') {
        return {
          valid: false,
          error: `Expected package name "appwrite-website", found "${packageJson.name}"`
        }
      }

      // Check src/routes/blog/ directory exists
      if (!existsSync(join(path, 'src', 'routes', 'blog'))) {
        return { valid: false, error: 'src/routes/blog/ directory not found' }
      }

      return { valid: true }
    } catch (err) {
      return { valid: false, error: `Validation failed: ${(err as Error).message}` }
    }
  })

  ipcMain.handle('repo:get-path', async () => {
    return store.get('repoPath')
  })

  ipcMain.handle('repo:set-path', async (_event, path: string) => {
    store.set('repoPath', path)
  })
}
