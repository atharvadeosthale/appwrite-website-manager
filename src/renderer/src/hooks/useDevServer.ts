import { useState, useEffect, useCallback, useRef } from 'react'

interface UseDevServerResult {
  running: boolean
  starting: boolean
  start: () => Promise<void>
  stop: () => Promise<void>
}

const POLL_INTERVAL = 3_000

export function useDevServer(): UseDevServerResult {
  const [running, setRunning] = useState(false)
  const [starting, setStarting] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const checkStatus = useCallback(async () => {
    try {
      const { running: isRunning } = await window.api.devServerStatus()
      setRunning(isRunning)
      if (isRunning) setStarting(false)
    } catch {
      // Silently handle errors during polling
    }
  }, [])

  const start = useCallback(async () => {
    setStarting(true)
    try {
      await window.api.devServerStart()
      // Don't set running=true here. Let the port poll determine status.
    } catch {
      setStarting(false)
    }
  }, [])

  const stop = useCallback(async () => {
    try {
      await window.api.devServerStop()
      // Don't set running=false here. Let the port poll determine status.
    } catch {
      // Silently handle errors
    }
  }, [])

  useEffect(() => {
    checkStatus()
    intervalRef.current = setInterval(checkStatus, POLL_INTERVAL)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [checkStatus])

  return { running, starting, start, stop }
}
