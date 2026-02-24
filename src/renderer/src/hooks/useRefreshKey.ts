import { createContext, useContext, useState, useCallback } from 'react'

interface RefreshContextValue {
  key: number
  refresh: () => void
}

export const RefreshContext = createContext<RefreshContextValue>({ key: 0, refresh: () => {} })

export function useRefreshKey(): RefreshContextValue {
  return useContext(RefreshContext)
}

export function useRefreshProvider(): RefreshContextValue {
  const [key, setKey] = useState(0)
  const refresh = useCallback(() => setKey((k) => k + 1), [])
  return { key, refresh }
}
