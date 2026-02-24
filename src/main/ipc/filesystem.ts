import { ipcMain, dialog } from 'electron'

export function registerFilesystemHandlers(): void {
  ipcMain.handle('fs:select-zip', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select Notion Export ZIP',
      properties: ['openFile'],
      filters: [{ name: 'ZIP Archives', extensions: ['zip'] }]
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    return result.filePaths[0]
  })

  ipcMain.handle('fs:select-image', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select Image',
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'] }]
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    return result.filePaths[0]
  })
}
