/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react'
import type { CoverTemplate } from '../types'

interface CoverTemplatesContextValue {
  templates: CoverTemplate[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

const CoverTemplatesContext = createContext<CoverTemplatesContextValue | null>(null)

let cachedTemplates: CoverTemplate[] | null = null
let templatesRequest: Promise<CoverTemplate[]> | null = null

async function loadCoverTemplates(force = false): Promise<CoverTemplate[]> {
  if (!force && cachedTemplates) {
    return cachedTemplates
  }

  if (!force && templatesRequest) {
    return templatesRequest
  }

  templatesRequest = window.api
    .getCoverTemplates()
    .then((result) => {
      cachedTemplates = result.templates
      return result.templates
    })
    .finally(() => {
      templatesRequest = null
    })

  return templatesRequest
}

export function CoverTemplatesProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [templates, setTemplates] = useState<CoverTemplate[]>(cachedTemplates ?? [])
  const [loading, setLoading] = useState(!cachedTemplates)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const nextTemplates = await loadCoverTemplates(true)
      setTemplates(nextTemplates)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch cover templates')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (cachedTemplates) {
      setTemplates(cachedTemplates)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    void loadCoverTemplates()
      .then((nextTemplates) => {
        setTemplates(nextTemplates)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to fetch cover templates')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const value = useMemo<CoverTemplatesContextValue>(
    () => ({
      templates,
      loading,
      error,
      refresh
    }),
    [templates, loading, error, refresh]
  )

  return <CoverTemplatesContext.Provider value={value}>{children}</CoverTemplatesContext.Provider>
}

export function useCoverTemplates(): CoverTemplatesContextValue {
  const context = useContext(CoverTemplatesContext)
  if (!context) {
    throw new Error('useCoverTemplates must be used within a CoverTemplatesProvider')
  }
  return context
}
