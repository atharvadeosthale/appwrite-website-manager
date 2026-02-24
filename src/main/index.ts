import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { execSync } from 'child_process'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import store from './store'
import { registerAllHandlers } from './ipc'

// Fix PATH for packaged app — Finder doesn't inherit the user's shell PATH
// so bun, npx, git, gh etc. won't be found without this
function fixPath(): void {
  const home = process.env.HOME || ''
  // Always add common tool locations
  const extraPaths = [
    `${home}/.bun/bin`,
    '/opt/homebrew/bin',
    '/opt/homebrew/sbin',
    '/usr/local/bin',
    '/usr/local/sbin',
    `${home}/.nvm/versions/node`,
    `${home}/.volta/bin`,
    `${home}/.cargo/bin`
  ]

  // Try to get the real PATH from user's login shell using markers
  // so we can extract it cleanly even if the shell prints extra output
  try {
    const userShell = process.env.SHELL || '/bin/zsh'
    const marker = `__PATH_${Date.now()}__`
    const output = execSync(
      `${userShell} -lc 'echo "${marker}$PATH${marker}"'`,
      { encoding: 'utf-8', timeout: 5000 }
    )
    const match = output.match(new RegExp(`${marker}(.+?)${marker}`))
    if (match && match[1]) {
      process.env.PATH = match[1]
      return
    }
  } catch {
    // Shell failed, use fallback
  }

  // Fallback: merge extra paths into whatever PATH we have
  const current = process.env.PATH || '/usr/bin:/bin:/usr/sbin:/sbin'
  const merged = new Set([...current.split(':'), ...extraPaths])
  process.env.PATH = [...merged].filter(Boolean).join(':')
}

fixPath()


function createWindow(): void {
  const savedBounds = store.get('windowBounds')

  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: savedBounds.width,
    height: savedBounds.height,
    x: savedBounds.x,
    y: savedBounds.y,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webSecurity: false
    }
  })

  // Save window bounds on resize and move
  const saveBounds = (): void => {
    const bounds = mainWindow.getBounds()
    store.set('windowBounds', {
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y
    })
  }

  mainWindow.on('resize', saveBounds)
  mainWindow.on('move', saveBounds)

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

// Register all IPC handlers
  registerAllHandlers()

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
