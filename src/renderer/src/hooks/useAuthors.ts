import { useState, useEffect, useCallback } from 'react'
import { useRefreshKey } from './useRefreshKey'
import type { Author } from '../types'

interface UseAuthorsResult {
  authors: Author[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useAuthors(): UseAuthorsResult {
  const { key } = useRefreshKey()
  const [authors, setAuthors] = useState<Author[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await window.api.getAuthors()
      setAuthors(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch authors')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch, key])

  return { authors, loading, error, refetch }
}
