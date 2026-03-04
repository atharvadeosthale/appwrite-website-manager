import { useState, useEffect, useCallback } from 'react'
import type { SetupCheckResult } from '../types'

interface UseSetupStatusResult {
  status: SetupCheckResult | null
  checking: boolean
  recheck: () => Promise<void>
}

export function useSetupStatus(): UseSetupStatusResult {
  const [status, setStatus] = useState<SetupCheckResult | null>(null)
  const [checking, setChecking] = useState(true)

  const recheck = useCallback(async () => {
    setChecking(true)
    try {
      const result = await window.api.setupCheckAll()
      setStatus(result)
    } catch {
      setStatus(null)
    } finally {
      setChecking(false)
    }
  }, [])

  useEffect(() => {
    recheck()
  }, [recheck])

  return { status, checking, recheck }
}
