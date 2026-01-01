import { BrowserWindow, app } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'

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
  const isMac = process.platform === 'darwin'

  // Determine the correct icon path for both development and production
  // In development: use src/assets/logo.ico
  // In production: the icon is bundled in resources/assets/
  let iconPath: string
  if (app.isPackaged) {
    // Production: icon is in resources folder (extraResources)
    iconPath = path.join(process.resourcesPath, 'assets', 'icons', 'icon.ico')
  } else {
    // Development: use src/assets/icons
    iconPath = path.join(process.env.APP_ROOT, 'src', 'assets', 'icons', 'icon.ico')
  }

  console.log('[Window] Icon path:', iconPath)
  console.log('[Window] APP_ROOT:', process.env.APP_ROOT)
  console.log('[Window] Is Packaged:', app.isPackaged)
  console.log('[Window] Icon exists:', fs.existsSync(iconPath))

  win = new BrowserWindow({
    width: 1228,          // Default width
    height: 720,          // Default height
    minWidth: 1228,       // Minimum width
    minHeight: 720,       // Minimum height
    frame: false,         // Remove default frame for custom titlebar
    // macOS-specific: use hiddenInset to show traffic lights with custom titlebar
    titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
    // Position traffic lights on macOS (moved down to avoid overlap with custom titlebar)
    trafficLightPosition: isMac ? { x: 15, y: 12 } : undefined,
    backgroundColor: '#0d1117', // Unified dark theme
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      webSecurity: false, // Allow loading local files via file:// protocol for audio playback
      allowRunningInsecureContent: true, // Allow loading local resources
      devTools: true, // Keep dev tools enabled
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








