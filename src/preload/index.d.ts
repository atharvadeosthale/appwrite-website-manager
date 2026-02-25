import { ElectronAPI } from '@electron-toolkit/preload'
import type {
  Author,
  Blog,
  Category,
  GitStatus,
  RemoteStatus,
  CLIResult,
  CreateAuthorOptions,
  CreateBlogOptions
} from '../renderer/src/types'

interface AppAPI {
  // Repo
  selectFolder: () => Promise<string | null>
  validateRepo: (path: string) => Promise<{ valid: boolean; error?: string }>
  getRepoPath: () => Promise<string>
  setRepoPath: (path: string) => Promise<void>
  openInCursor: (filePath?: string) => Promise<{ success: boolean; error?: string }>

  // Git
  gitBranch: () => Promise<string>
  gitBranches: () => Promise<string[]>
  gitSwitch: (branch: string) => Promise<{ success: boolean; error?: string }>
  gitStatus: () => Promise<GitStatus>
  gitRemoteStatus: () => Promise<RemoteStatus & { error?: string }>
  gitPull: () => Promise<{ success: boolean; conflict: boolean }>
  gitHardReset: () => Promise<{ success: boolean; error?: string }>
  gitStageAndCommit: (message: string) => Promise<{ success: boolean; error?: string }>
  gitCreateBranch: (name: string) => Promise<{ success: boolean; error?: string }>
  gitCreatePr: (title: string, body: string) => Promise<{ success: boolean; url?: string; error?: string }>

  // CLI - data queries
  getAuthors: () => Promise<Author[]>
  getCategories: () => Promise<Category[]>
  getBlogs: () => Promise<Blog[]>

  // CLI - mutations
  createAuthor: (options: CreateAuthorOptions) => Promise<CLIResult>
  createBlog: (options: CreateBlogOptions) => Promise<CLIResult>
  importNotion: (zip: string, slug: string) => Promise<CLIResult>
  sanitize: (slug: string) => Promise<CLIResult>

  // CLI - streaming output listener
  onCliOutput: (callback: (data: string) => void) => void
  removeCliOutputListener: () => void

  // Dev Server
  devServerStart: () => Promise<{ success: boolean; error?: string }>
  devServerStop: () => Promise<{ success: boolean; error?: string }>
  devServerStatus: () => Promise<{ running: boolean }>
  onDevServerOutput: (callback: (data: string) => void) => void
  onDevServerStopped: (callback: () => void) => void
  onDevServerError: (callback: (error: string) => void) => void
  removeDevServerListeners: () => void

  // Filesystem
  selectZip: () => Promise<string | null>
  selectImage: () => Promise<string | null>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: AppAPI
  }
}
