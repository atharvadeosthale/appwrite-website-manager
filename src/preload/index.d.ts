import { ElectronAPI } from '@electron-toolkit/preload'
import type {
  Author,
  Blog,
  Category,
  GitStatus,
  RemoteStatus,
  CLIResult,
  CreateAuthorOptions,
  CreateBlogOptions,
  UpdateBlogOptions,
  SetupCheckResult,
  InstallResult
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
  gitBranchPr: () => Promise<{ hasPr: boolean; url?: string; error?: string }>
  gitCreatePr: (
    title: string,
    body: string
  ) => Promise<{ success: boolean; url?: string; existing?: boolean; error?: string }>

  // CLI - data queries
  getAuthors: () => Promise<Author[]>
  getCategories: () => Promise<Category[]>
  getBlogs: () => Promise<Blog[]>

  // CLI - mutations
  createAuthor: (options: CreateAuthorOptions) => Promise<CLIResult>
  createBlog: (options: CreateBlogOptions) => Promise<CLIResult>
  updateBlog: (options: UpdateBlogOptions) => Promise<CLIResult>
  readBlogContent: (slug: string) => Promise<{ success: boolean; content?: string; error?: string }>
  writeBlogContent: (slug: string, content: string) => Promise<{ success: boolean; error?: string }>
  importNotion: (zip: string, slug: string) => Promise<CLIResult>
  sanitize: (slug: string) => Promise<CLIResult>
  writeWithAI: (blogSlug: string, aiPrompt: string) => Promise<CLIResult>
  checkClaude: () => Promise<{ installed: boolean; version?: string; error?: string }>
  openTerminalLogin: () => Promise<{ success: boolean; error?: string }>

  // CLI - streaming output listener
  onCliOutput: (callback: (data: string) => void) => void
  onCliOutputDone: (callback: () => void) => void
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

  // Setup
  setupCheckAll: () => Promise<SetupCheckResult>
  setupInstallGit: () => Promise<InstallResult>
  setupInstallNode: () => Promise<InstallResult>
  setupInstallBun: () => Promise<InstallResult>
  setupInstallGh: () => Promise<InstallResult>
  setupInstallClaude: () => Promise<InstallResult>
  setupInstallAll: () => Promise<InstallResult>
  setupAuthGh: () => Promise<InstallResult>
  setupCancelAuthGh: () => Promise<{ success: boolean }>
  onSetupOutput: (callback: (data: string) => void) => void
  onSetupGhCode: (callback: (code: string) => void) => void
  removeSetupListeners: () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: AppAPI
  }
}
