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
  cover?: string
  importNotion?: string
}
