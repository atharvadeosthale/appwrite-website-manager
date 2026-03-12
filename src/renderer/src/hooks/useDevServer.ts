import { useState, useEffect, useCallback, useRef } from 'react'

interface UseDevServerResult {
  running: boolean
  starting: boolean
  stopping: boolean
  start: () => Promise<void>
  stop: () => Promise<void>
}

const POLL_INTERVAL = 3_000

export function useDevServer(): UseDevServerResult {
  const [running, setRunning] = useState(false)
  const [starting, setStarting] = useState(false)
  const [stopping, setStopping] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const checkStatus = useCallback(async () => {
    try {
      const { running: isRunning } = await window.api.devServerStatus()
      setRunning(isRunning)
      if (isRunning) setStarting(false)
      if (!isRunning) setStopping(false)
    } catch {
      // Silently handle errors during polling
    }
  }, [])

  const start = useCallback(async () => {
    if (starting || stopping) return
    setStarting(true)
    setStopping(false)
    try {
      const result = await window.api.devServerStart()
      if (!result.success) {
        setStarting(false)
      }
      // Don't set running=true here. Let the port poll determine status.
    } catch {
      setStarting(false)
    }
  }, [starting, stopping])

  const stop = useCallback(async () => {
    if (starting || stopping) return
    setStarting(false)
    setStopping(true)
    try {
      const result = await window.api.devServerStop()
      if (!result.success) {
        setStopping(false)
      } else {
        await checkStatus()
      }
    } catch {
      setStopping(false)
    }
  }, [checkStatus, starting, stopping])

  useEffect(() => {
    const initialCheckTimer = setTimeout(() => {
      void checkStatus()
    }, 0)

    intervalRef.current = setInterval(() => {
      void checkStatus()
    }, POLL_INTERVAL)

    return () => {
      clearTimeout(initialCheckTimer)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [checkStatus])

  return { running, starting, stopping, start, stop }
}
