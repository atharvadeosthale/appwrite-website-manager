export interface Author {
  slug: string
  name: string
  role: string
  bio: string
  avatar: string
  twitter: string
  github: string
  linkedin: string
}

export interface Blog {
  slug: string
  title: string
  description: string
  date: string
  cover: string
  timeToRead: number
  author: string
  category: string
  featured: boolean
  unlisted: boolean
}

export interface Category {
  slug: string
  name: string
  description: string
}

export interface GitStatus {
  clean: boolean
  files: string[]
}

export interface RemoteStatus {
  behind: number
  ahead: number
}

export interface CLIResult {
  success: boolean
  output: string
  error?: string
}

export interface CreateAuthorOptions {
  name: string
  slug: string
  role: string
  bio: string
  avatar?: string
  twitter?: string
  github?: string
  linkedin?: string
}

export interface CreateBlogOptions {
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

export interface UpdateBlogOptions {
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

export interface PrerequisiteStatus {
  id: 'git' | 'node' | 'bun' | 'gh' | 'claude'
  installed: boolean
  version?: string
  authenticated?: boolean // only for gh
}

export interface SetupCheckResult {
  allPassed: boolean
  prerequisites: PrerequisiteStatus[]
  platform: 'darwin' | 'win32' | 'linux'
}

export interface InstallResult {
  success: boolean
  error?: string
  output?: string
}
