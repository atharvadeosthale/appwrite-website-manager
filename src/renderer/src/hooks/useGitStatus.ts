import { useState, useEffect, useCallback, useRef } from 'react'
import type { GitStatus, RemoteStatus } from '../types'
import { subscribeGitStatusRefresh } from './gitStatusRefresh'

interface UseGitStatusResult {
  branch: string
  status: GitStatus | null
  remoteStatus: RemoteStatus | null
  loading: boolean
  refetch: () => void
}

const POLL_INTERVAL = 30_000

export function useGitStatus(): UseGitStatusResult {
  const [branch, setBranch] = useState('')
  const [status, setStatus] = useState<GitStatus | null>(null)
  const [remoteStatus, setRemoteStatus] = useState<RemoteStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    try {
      const [branchResult, statusResult, remoteResult] = await Promise.all([
        window.api.gitBranch(),
        window.api.gitStatus(),
        window.api.gitRemoteStatus()
      ])
      setBranch(branchResult)
      setStatus(statusResult)
      if (!remoteResult.error) {
        setRemoteStatus({ behind: remoteResult.behind, ahead: remoteResult.ahead })
      }
    } catch {
      // Silently handle errors during polling
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refetch()
    intervalRef.current = setInterval(refetch, POLL_INTERVAL)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [refetch])

  useEffect(() => {
    return subscribeGitStatusRefresh(() => {
      void refetch()
    })
  }, [refetch])

  return { branch, status, remoteStatus, loading, refetch }
}
