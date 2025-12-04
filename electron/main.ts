import { app, BrowserWindow, Menu, globalShortcut } from 'electron'
import { createWindow, setupWindowEvents, VITE_DEV_SERVER_URL } from './window'
import { registerIpcHandlers } from './ipc/handlers'
import { createTray, updateWindowVisibility } from './tray'

// Remove the menu bar completely
Menu.setApplicationMenu(null)

// Register IPC handlers
registerIpcHandlers()

// Setup window event handlers
setupWindowEvents()

// Only register dev tools shortcuts in development mode
// Security: Prevent users from accessing dev tools in production builds
if (VITE_DEV_SERVER_URL) {
  app.whenReady().then(() => {
    // Register keyboard shortcut for dev tools (F12)
    globalShortcut.register('F12', () => {
      const windows = BrowserWindow.getAllWindows()
      windows.forEach(win => {
        if (win.webContents.isDevToolsOpened()) {
          win.webContents.closeDevTools()
        } else {
          win.webContents.openDevTools()
        }
      })
    })
    
    // Also register Ctrl+Shift+I (Windows/Linux) and Cmd+Option+I (Mac)
    globalShortcut.register('CommandOrControl+Shift+I', () => {
      const windows = BrowserWindow.getAllWindows()
      windows.forEach(win => {
        if (win.webContents.isDevToolsOpened()) {
          win.webContents.closeDevTools()
        } else {
          win.webContents.openDevTools()
        }
      })
    })
  })
}

// Unregister shortcuts when app quits
app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

// Initialize app when ready
app.whenReady().then(async () => {
  const window = createWindow()
  createTray()
  
  // Also track the specific window instance
  window.on('show', () => {
    updateWindowVisibility(true)
  })
  
  window.on('hide', () => {
    updateWindowVisibility(false)
  })
  
  // Optional: Auto-scan on startup (can be removed if you want user to select folder)
  // const musicFolderPath = 'C:\\Users\\abdul\\Music'
  // await scanAndLogMusicFiles(musicFolderPath)
})
