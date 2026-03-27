import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type {
  CoverTemplatesResult,
  PrepareGeneratedCoverInput,
  PrepareGeneratedCoverResult,
  CleanupTempFileResult
} from '../renderer/src/types'

// Custom APIs for renderer
const api = {
  // Repo
  selectFolder: (): Promise<string | null> => ipcRenderer.invoke('repo:select-folder'),
  validateRepo: (path: string): Promise<{ valid: boolean; error?: string }> =>
    ipcRenderer.invoke('repo:validate', path),
  getRepoPath: (): Promise<string> => ipcRenderer.invoke('repo:get-path'),
  setRepoPath: (path: string): Promise<void> => ipcRenderer.invoke('repo:set-path', path),
  openInCursor: (filePath?: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('repo:open-in-cursor', filePath),

  // Git
  gitBranch: (): Promise<string> => ipcRenderer.invoke('git:branch'),
  gitBranches: (): Promise<string[]> => ipcRenderer.invoke('git:branches'),
  gitSwitch: (branch: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('git:switch', branch),
  gitStatus: (): Promise<{ clean: boolean; files: string[] }> => ipcRenderer.invoke('git:status'),
  gitRemoteStatus: (): Promise<{ behind: number; ahead: number; error?: string }> =>
    ipcRenderer.invoke('git:remote-status'),
  gitPull: (): Promise<{ success: boolean; conflict: boolean }> => ipcRenderer.invoke('git:pull'),
  gitHardReset: (): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('git:hard-reset'),
  gitStageAndCommit: (message: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('git:stage-and-commit', { message }),
  gitCreateBranch: (name: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('git:create-branch', { name }),
  gitBranchPr: (): Promise<{ hasPr: boolean; url?: string; error?: string }> =>
    ipcRenderer.invoke('git:branch-pr'),
  gitCreatePr: (
    title: string,
    body: string
  ): Promise<{ success: boolean; url?: string; existing?: boolean; error?: string }> =>
    ipcRenderer.invoke('git:create-pr', { title, body }),

  // CLI - data queries
  getAuthors: (): Promise<unknown[]> => ipcRenderer.invoke('cli:get-authors'),
  getCategories: (): Promise<unknown[]> => ipcRenderer.invoke('cli:get-categories'),
  getBlogs: (): Promise<unknown[]> => ipcRenderer.invoke('cli:get-blogs'),

  // CLI - mutations
  createAuthor: (
    options: Record<string, unknown>
  ): Promise<{ success: boolean; output: string; error?: string }> =>
    ipcRenderer.invoke('cli:create-author', options),
  createBlog: (
    options: Record<string, unknown>
  ): Promise<{ success: boolean; output: string; error?: string }> =>
    ipcRenderer.invoke('cli:create-blog', options),
  updateBlog: (
    options: Record<string, unknown>
  ): Promise<{ success: boolean; output: string; error?: string }> =>
    ipcRenderer.invoke('cli:update-blog', options),
  readBlogContent: (
    slug: string
  ): Promise<{ success: boolean; content?: string; error?: string }> =>
    ipcRenderer.invoke('repo:read-blog-content', slug),
  writeBlogContent: (
    slug: string,
    content: string
  ): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('repo:write-blog-content', slug, content),
  importNotion: (
    zip: string,
    slug: string
  ): Promise<{ success: boolean; output: string; error?: string }> =>
    ipcRenderer.invoke('cli:import-notion', zip, slug),
  sanitize: (slug: string): Promise<{ success: boolean; output: string; error?: string }> =>
    ipcRenderer.invoke('cli:sanitize', slug),
  getCoverTemplates: (): Promise<CoverTemplatesResult> => ipcRenderer.invoke('cover:get-templates'),
  prepareGeneratedCover: (input: PrepareGeneratedCoverInput): Promise<PrepareGeneratedCoverResult> =>
    ipcRenderer.invoke('cover:prepare-generated-cover', input),
  runOptimize: (): Promise<{ success: boolean; output: string; error?: string }> =>
    ipcRenderer.invoke('cover:run-optimize'),
  cleanupGeneratedCoverTempFile: (path: string): Promise<CleanupTempFileResult> =>
    ipcRenderer.invoke('cover:cleanup-temp-file', path),
  writeWithAI: (
    blogSlug: string,
    aiPrompt: string
  ): Promise<{ success: boolean; output: string; error?: string }> => {
    console.log('[preload:writeWithAI] Invoking cli:write-with-ai for', blogSlug)
    return ipcRenderer.invoke('cli:write-with-ai', { blogSlug, aiPrompt }).then(
      (result) => {
        console.log('[preload:writeWithAI] IPC resolved — success:', result?.success)
        return result
      },
      (err) => {
        console.error('[preload:writeWithAI] IPC rejected:', err)
        throw err
      }
    )
  },
  checkClaude: (): Promise<{ installed: boolean; version?: string; error?: string }> =>
    ipcRenderer.invoke('cli:check-claude'),
  openTerminalLogin: (): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('cli:open-terminal-login'),

  // CLI - streaming output listener
  onCliOutput: (callback: (data: string) => void): void => {
    // Remove any stale listeners before adding a new one to prevent stacking
    ipcRenderer.removeAllListeners('cli:output')
    ipcRenderer.on('cli:output', (_event, data: string) => {
      console.log('[preload:onCliOutput] Received chunk:', data.length, 'bytes')
      callback(data)
    })
  },
  onCliOutputDone: (callback: () => void): void => {
    ipcRenderer.removeAllListeners('cli:output:done')
    ipcRenderer.once('cli:output:done', () => callback())
  },
  removeCliOutputListener: (): void => {
    ipcRenderer.removeAllListeners('cli:output')
    ipcRenderer.removeAllListeners('cli:output:done')
  },

  // Dev Server
  devServerStart: (): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('dev-server:start'),
  devServerStop: (): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('dev-server:stop'),
  devServerStatus: (): Promise<{ running: boolean }> => ipcRenderer.invoke('dev-server:status'),
  onDevServerOutput: (callback: (data: string) => void): void => {
    ipcRenderer.on('dev-server:output', (_event, data: string) => callback(data))
  },
  onDevServerStopped: (callback: () => void): void => {
    ipcRenderer.on('dev-server:stopped', () => callback())
  },
  onDevServerError: (callback: (error: string) => void): void => {
    ipcRenderer.on('dev-server:error', (_event, error: string) => callback(error))
  },
  removeDevServerListeners: (): void => {
    ipcRenderer.removeAllListeners('dev-server:output')
    ipcRenderer.removeAllListeners('dev-server:stopped')
    ipcRenderer.removeAllListeners('dev-server:error')
  },

  // Filesystem
  selectZip: (): Promise<string | null> => ipcRenderer.invoke('fs:select-zip'),
  selectImage: (): Promise<string | null> => ipcRenderer.invoke('fs:select-image'),
  fileExists: (path: string): Promise<boolean> => ipcRenderer.invoke('fs:file-exists', path),

  // Setup
  setupCheckAll: (): Promise<{
    allPassed: boolean
    prerequisites: { id: string; installed: boolean; version?: string; authenticated?: boolean }[]
    platform: string
  }> => ipcRenderer.invoke('setup:check-all'),
  setupInstallGit: (): Promise<{ success: boolean; error?: string; output?: string }> =>
    ipcRenderer.invoke('setup:install-git'),
  setupInstallNode: (): Promise<{ success: boolean; error?: string; output?: string }> =>
    ipcRenderer.invoke('setup:install-node'),
  setupInstallBun: (): Promise<{ success: boolean; error?: string; output?: string }> =>
    ipcRenderer.invoke('setup:install-bun'),
  setupInstallGh: (): Promise<{ success: boolean; error?: string; output?: string }> =>
    ipcRenderer.invoke('setup:install-gh'),
  setupInstallClaude: (): Promise<{ success: boolean; error?: string; output?: string }> =>
    ipcRenderer.invoke('setup:install-claude'),
  setupInstallAll: (): Promise<{ success: boolean; error?: string; output?: string }> =>
    ipcRenderer.invoke('setup:install-all'),
  setupAuthGh: (): Promise<{ success: boolean; error?: string; output?: string }> =>
    ipcRenderer.invoke('setup:auth-gh'),
  setupCancelAuthGh: (): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('setup:cancel-auth-gh'),
  onSetupOutput: (callback: (data: string) => void): void => {
    ipcRenderer.on('setup:output', (_event, data: string) => callback(data))
  },
  onSetupGhCode: (callback: (code: string) => void): void => {
    ipcRenderer.on('setup:gh-code', (_event, code: string) => callback(code))
  },
  removeSetupListeners: (): void => {
    ipcRenderer.removeAllListeners('setup:output')
    ipcRenderer.removeAllListeners('setup:gh-code')
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
