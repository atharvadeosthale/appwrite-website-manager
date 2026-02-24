import { useState, useEffect, useCallback } from 'react'
import { useRefreshKey } from './useRefreshKey'
import type { Category } from '../types'

interface UseCategoriesResult {
  categories: Category[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useCategories(): UseCategoriesResult {
  const { key } = useRefreshKey()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await window.api.getCategories()
      setCategories(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch categories')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch, key])

  return { categories, loading, error, refetch }
}
