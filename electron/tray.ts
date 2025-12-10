import { Tray, Menu, nativeImage, app, BrowserWindow } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createWindow } from './window'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let tray: Tray | null = null
let isPlaying = false

/**
 * Creates the tray context menu with current state
 */
function createTrayMenu(): Menu {
  const windows = BrowserWindow.getAllWindows()
  const hasWindow = windows.length > 0
  const isVisible = hasWindow && windows[0].isVisible()

  return Menu.buildFromTemplate([
    {
      label: isVisible ? 'Hide' : 'Show',
      click: () => {
        const windows = BrowserWindow.getAllWindows()
        if (windows.length === 0) {
          createWindow()
        } else {
          const window = windows[0]
          if (window.isVisible()) {
            window.hide()
          } else {
            window.show()
            window.focus()
          }
        }
        updateTrayMenu()
      },
    },
    { type: 'separator' },
    {
      label: isPlaying ? 'Pause' : 'Play',
      click: () => {
        // Send play/pause command to renderer
        const windows = BrowserWindow.getAllWindows()
        if (windows.length > 0) {
          windows[0].webContents.send('tray-play-pause')
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit()
      },
    },
  ])
}

/**
 * Updates the tray menu with current state
 */
export function updateTrayMenu() {
  if (tray) {
    const menu = createTrayMenu()
    tray.setContextMenu(menu)
  }
}

/**
 * Updates playback state in tray menu
 */
export function updatePlaybackState(playing: boolean) {
  isPlaying = playing
  updateTrayMenu()
}

/**
 * Updates window visibility state in tray menu
 */
export function updateWindowVisibility(_visible: boolean) {
  // Visibility is checked dynamically in createTrayMenu()
  updateTrayMenu()
}

/**
 * Creates and sets up the system tray icon
 */
export function createTray(): Tray {
  // Get the path to the tray icon
  // In dev: src/assets/trayIcon.svg
  // In production: dist/assets/trayIcon.svg (if copied) or use public folder
  const iconPath = VITE_DEV_SERVER_URL
    ? path.join(process.env.APP_ROOT, 'src', 'assets', 'trayIcon.svg')
    : path.join(process.env.APP_ROOT, 'dist', 'assets', 'trayIcon.svg')

  // Create native image from the icon file
  const icon = nativeImage.createFromPath(iconPath)

  // Create tray with the icon
  tray = new Tray(icon)

  // Set tooltip
  tray.setToolTip('Music Sync App')

  // Set initial menu
  updateTrayMenu()

  // Handle tray icon click (show/hide window)
  tray.on('click', () => {
    const windows = BrowserWindow.getAllWindows()

    if (windows.length === 0) {
      // No windows open, create a new one
      createWindow()
    } else {
      // Toggle window visibility
      const window = windows[0]
      if (window.isVisible()) {
        window.hide()
      } else {
        window.show()
        window.focus()
      }
    }
    updateTrayMenu()
  })

  return tray
}

/**
 * Gets the current tray instance
 */
export function getTray(): Tray | null {
  return tray
}

