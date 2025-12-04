import { BrowserWindow, app } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
//
process.env.APP_ROOT = path.join(__dirname, '..')

// Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null = null

/**
 * Creates the main application window
 */
export function createWindow(): BrowserWindow {
  win = new BrowserWindow({
    width: 800,           // Default width
    height: 700,          // Default height
    minWidth: 450,        // Minimum width
    minHeight: 600,       // Minimum height
    frame: false,         // Remove default frame
    titleBarStyle: 'hidden', // Hide title bar (macOS)
    backgroundColor: '#1a1a1a', // Match app background
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      // Security: Keep webSecurity enabled (default). Audio playback via file:// protocol
      // works with html5 mode in Howler.js without disabling web security.
      // webSecurity: true is the default and should not be changed
      // allowRunningInsecureContent should never be enabled in production
      contextIsolation: true, // Ensure context isolation is enabled (default in Electron 12+)
      nodeIntegration: false, // Ensure Node.js integration is disabled in renderer (default)
      devTools: process.env.NODE_ENV !== 'production', // Only enable dev tools in development
    },
  })

  // Send window state changes to renderer
  win.on('maximize', () => {
    win?.webContents.send('window-state-changed', true)
  })

  win.on('unmaximize', () => {
    win?.webContents.send('window-state-changed', false)
  })

  // Hide menu bar (redundant but ensures it's hidden)
  win.setMenuBarVisibility(false)

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
    // Send initial window state
    if (win) {
      win.webContents.send('window-state-changed', win.isMaximized())
    }
  })

  // Open dev tools automatically in development mode
  if (VITE_DEV_SERVER_URL) {
    win.webContents.openDevTools()
  }

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }

  return win
}

/**
 * Sets up window event handlers
 */
export function setupWindowEvents() {
  // Quit when all windows are closed, except on macOS. There, it's common
  // for applications and their menu bar to stay active until the user quits
  // explicitly with Cmd + Q.
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
      win = null
    }
  })

  app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
}








