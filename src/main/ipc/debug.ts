import { ipcMain } from 'electron'

interface DebugLogPayload {
  scope?: string
  message: string
  data?: unknown
}

export function registerDebugHandlers(): void {
  ipcMain.on('debug:log', (_event, payload: DebugLogPayload) => {
    const scope = payload?.scope || 'renderer'
    const message = payload?.message || ''
    if (payload?.data !== undefined) {
      console.log(`[${scope}] ${message}`, payload.data)
      return
    }
    console.log(`[${scope}] ${message}`)
  })
}
