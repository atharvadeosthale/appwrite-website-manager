import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  // Repo
  selectFolder: (): Promise<string | null> => ipcRenderer.invoke('repo:select-folder'),
  validateRepo: (path: string): Promise<{ valid: boolean; error?: string }> =>
    ipcRenderer.invoke('repo:validate', path),
  getRepoPath: (): Promise<string> => ipcRenderer.invoke('repo:get-path'),
  setRepoPath: (path: string): Promise<void> => ipcRenderer.invoke('repo:set-path', path),

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
  gitCreatePr: (
    title: string,
    body: string
  ): Promise<{ success: boolean; url?: string; error?: string }> =>
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
  importNotion: (
    zip: string,
    slug: string
  ): Promise<{ success: boolean; output: string; error?: string }> =>
    ipcRenderer.invoke('cli:import-notion', zip, slug),
  sanitize: (slug: string): Promise<{ success: boolean; output: string; error?: string }> =>
    ipcRenderer.invoke('cli:sanitize', slug),

  // CLI - streaming output listener
  onCliOutput: (callback: (data: string) => void): void => {
    ipcRenderer.on('cli:output', (_event, data: string) => callback(data))
  },
  removeCliOutputListener: (): void => {
    ipcRenderer.removeAllListeners('cli:output')
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
  selectImage: (): Promise<string | null> => ipcRenderer.invoke('fs:select-image')
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
