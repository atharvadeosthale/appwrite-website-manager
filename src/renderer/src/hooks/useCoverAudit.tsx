/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react'
import { useRefreshKey } from './useRefreshKey'
import { subscribeCoverAuditRefresh } from './coverAuditRefresh'
import type { Blog } from '../types'

const POLL_INTERVAL = 60_000
const REMOTE_PROTOCOL_REGEX = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//
const WINDOWS_ABSOLUTE_REGEX = /^[a-zA-Z]:[\\/]/u

interface CoverAuditContextValue {
  missingCoverBlogs: Blog[]
  missingCoverCount: number
  loading: boolean
  lastCheckedAt: string | null
  refetch: () => void
}

const CoverAuditContext = createContext<CoverAuditContextValue | null>(null)

function decodeURIComponentSafe(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function stripQueryAndHash(path: string): string {
  const [withoutHash] = path.split('#')
  const [withoutQuery] = withoutHash.split('?')
  return withoutQuery
}

function joinPath(basePath: string, relativePath: string): string {
  const normalizedBase = basePath.replace(/[\\/]+$/, '')
  const normalizedRelative = relativePath.replace(/^[\\/]+/, '')
  return `${normalizedBase}/${normalizedRelative}`
}

function toFilePathFromUrl(urlValue: string): string {
  try {
    const parsed = new URL(urlValue)
    const pathname = decodeURIComponentSafe(parsed.pathname)
    if (/^\/[a-zA-Z]:\//u.test(pathname)) {
      return pathname.slice(1)
    }
    return pathname
  } catch {
    return urlValue
  }
}

function resolveCoverCandidates(coverPath: string, repoPath: string): string[] {
  const normalized = decodeURIComponentSafe(stripQueryAndHash(coverPath.trim()))
  if (!normalized) return []

  if (normalized.startsWith('file://')) {
    return [toFilePathFromUrl(normalized)]
  }

  if (REMOTE_PROTOCOL_REGEX.test(normalized)) {
    return []
  }

  if (WINDOWS_ABSOLUTE_REGEX.test(normalized) || normalized.startsWith('/')) {
    const candidates = [normalized]
    if (normalized.startsWith('/')) {
      candidates.push(joinPath(repoPath, normalized))
      if (!normalized.startsWith('/static/')) {
        candidates.push(joinPath(repoPath, `/static${normalized}`))
      }
    }
    return Array.from(new Set(candidates))
  }

  const relativeCandidates = [joinPath(repoPath, normalized)]
  if (!normalized.startsWith('static/')) {
    relativeCandidates.push(joinPath(repoPath, `static/${normalized}`))
  }

  return Array.from(new Set(relativeCandidates))
}

async function hasCoverAsset(cover: string, repoPath: string): Promise<boolean> {
  const normalizedCover = cover.trim()
  if (!normalizedCover) return false

  if (REMOTE_PROTOCOL_REGEX.test(normalizedCover)) {
    return true
  }

  const candidates = resolveCoverCandidates(normalizedCover, repoPath)
  if (candidates.length === 0) {
    return true
  }

  const checks = await Promise.all(candidates.map((path) => window.api.fileExists(path)))
  return checks.some(Boolean)
}

export function CoverAuditProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const { key } = useRefreshKey()
  const [missingCoverBlogs, setMissingCoverBlogs] = useState<Blog[]>([])
  const [loading, setLoading] = useState(false)
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const inFlightRef = useRef(false)

  const refetch = useCallback(() => {
    if (inFlightRef.current) return

    inFlightRef.current = true
    setLoading(true)

    void (async () => {
      try {
        const [blogs, repoPath] = await Promise.all([
          window.api.getBlogs(),
          window.api.getRepoPath().catch(() => '')
        ])

        const checks = await Promise.all(
          blogs.map(async (blog) => {
            const coverValue = blog.cover?.trim() ?? ''
            if (!coverValue) {
              return { blog, missing: true, reason: 'empty-cover' as const }
            }

            if (!repoPath) {
              return { blog, missing: false, reason: 'repo-unavailable' as const }
            }

            const exists = await hasCoverAsset(coverValue, repoPath)
            return { blog, missing: !exists, reason: exists ? ('exists' as const) : ('missing-file' as const) }
          })
        )

        const missing = checks.filter((entry) => entry.missing).map((entry) => entry.blog)
        console.log(
          `[cover-audit] Checked ${blogs.length} blogs. Missing covers: ${missing.length}.`
        )
        setMissingCoverBlogs(missing)
        setLastCheckedAt(new Date().toISOString())
      } catch (err) {
        console.error('[cover-audit] Failed to run cover audit:', err)
      } finally {
        inFlightRef.current = false
        setLoading(false)
      }
    })()
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch, key])

  useEffect(() => {
    intervalRef.current = setInterval(refetch, POLL_INTERVAL)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [refetch])

  useEffect(() => {
    return subscribeCoverAuditRefresh(() => {
      refetch()
    })
  }, [refetch])

  useEffect(() => {
    const handleFocus = (): void => {
      refetch()
    }

    window.addEventListener('focus', handleFocus)
    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [refetch])

  const value = useMemo<CoverAuditContextValue>(
    () => ({
      missingCoverBlogs,
      missingCoverCount: missingCoverBlogs.length,
      loading,
      lastCheckedAt,
      refetch
    }),
    [missingCoverBlogs, loading, lastCheckedAt, refetch]
  )

  return <CoverAuditContext.Provider value={value}>{children}</CoverAuditContext.Provider>
}

export function useCoverAudit(): CoverAuditContextValue {
  const context = useContext(CoverAuditContext)
  if (!context) {
    throw new Error('useCoverAudit must be used within a CoverAuditProvider')
  }
  return context
}
