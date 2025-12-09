import { app, BrowserWindow, Menu, globalShortcut } from 'electron'
import { createWindow, setupWindowEvents } from './window'
import { registerIpcHandlers } from './ipc/handlers'
import { createTray, updateWindowVisibility } from './tray'
import { initializeDatabase, closeDatabase } from './metadataCache'

// Remove the menu bar completely
Menu.setApplicationMenu(null)

// Register IPC handlers
registerIpcHandlers()

// Setup window event handlers
setupWindowEvents()

// Register keyboard shortcut for dev tools (F12)
app.whenReady().then(() => {
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

// Unregister shortcuts and cleanup when app quits
app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  // Close the metadata cache database
  closeDatabase()
})

// Initialize app when ready
app.whenReady().then(async () => {
  // Initialize the metadata cache database
  initializeDatabase()
  
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
