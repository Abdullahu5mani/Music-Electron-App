import { ipcMain, BrowserWindow, dialog } from 'electron'
import { updatePlaybackState, updateWindowVisibility } from '../../tray'
import { getStoredSettings, saveSettings as saveStoredSettings, AppSettings } from '../../settings'

/**
 * Registers IPC handlers for system operations
 * - Window controls (minimize, maximize, close)
 * - Playback state (for tray menu)
 * - Settings persistence
 * - Platform info
 */
export function registerSystemHandlers() {
  // ==========================================
  // Window Controls
  // ==========================================

  // Handle window minimize
  ipcMain.on('window-minimize', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    window?.minimize()
  })

  // Handle window maximize/unmaximize
  ipcMain.on('window-maximize', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (window?.isMaximized()) {
      window.unmaximize()
      window.webContents.send('window-state-changed', false)
    } else {
      window?.maximize()
      window?.webContents.send('window-state-changed', true)
    }
  })

  // Handle window close
  ipcMain.on('window-close', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    window?.close()
  })

  // ==========================================
  // Playback State (Tray Menu)
  // ==========================================

  // Handle playback state changes (for tray menu)
  ipcMain.on('playback-state-changed', (_event, isPlaying: boolean) => {
    updatePlaybackState(isPlaying)
  })

  // Handle window visibility changes (for tray menu)
  ipcMain.on('window-visibility-changed', (_event, visible: boolean) => {
    updateWindowVisibility(visible)
  })

  // ==========================================
  // Settings
  // ==========================================

  // Handle get settings
  ipcMain.handle('get-settings', async () => {
    try {
      return getStoredSettings()
    } catch (error) {
      console.error('Error getting settings:', error)
      return {
        musicFolderPath: null,
        downloadFolderPath: null,
        scanSubfolders: true,
      }
    }
  })

  // Handle save settings
  ipcMain.handle('save-settings', async (_event, settings: AppSettings) => {
    try {
      saveStoredSettings(settings)
      return { success: true }
    } catch (error) {
      console.error('Error saving settings:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  // Handle download folder selection dialog
  ipcMain.handle('select-download-folder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select Download Folder',
    })
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0]
    }
    return null
  })

  // ==========================================
  // Platform Info
  // ==========================================

  // Handle get platform info
  ipcMain.handle('get-platform-info', async () => {
    return {
      platform: process.platform,
      arch: process.arch,
    }
  })
}

