import { useState, useEffect, useCallback } from 'react'
import { useRefreshKey } from './useRefreshKey'
import type { Blog } from '../types'

interface UseBlogsResult {
  blogs: Blog[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useBlogs(): UseBlogsResult {
  const { key } = useRefreshKey()
  const [blogs, setBlogs] = useState<Blog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await window.api.getBlogs()
      setBlogs(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch blogs')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch, key])

  return { blogs, loading, error, refetch }
}
