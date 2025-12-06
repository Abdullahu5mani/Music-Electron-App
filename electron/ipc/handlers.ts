import { ipcMain, BrowserWindow, dialog } from 'electron'
import { scanMusicFiles } from '../musicScanner'
import { downloadYouTubeAudio } from '../youtubeDownloader'
import { updatePlaybackState, updateWindowVisibility } from '../tray'
import { getStoredSettings, saveSettings as saveStoredSettings } from '../settings'
import { getAllBinaryStatuses } from '../binaryManager'
import fs from 'fs'

/**
 * Registers all IPC handlers for communication between main and renderer processes
 */
export function registerIpcHandlers() {
  // Handle music folder scanning
  ipcMain.handle('scan-music-folder', async (_event, folderPath: string) => {
    try {
      return await scanMusicFiles(folderPath)
    } catch (error) {
      console.error('Error scanning folder:', error)
      throw error
    }
  })

  // Handle music folder selection dialog
  ipcMain.handle('select-music-folder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select Music Folder',
    })
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0]
    }
    return null
  })

  // Handle playback state changes (for tray menu)
  ipcMain.on('playback-state-changed', (_event, isPlaying: boolean) => {
    updatePlaybackState(isPlaying)
  })

  // Handle window visibility changes (for tray menu)
  ipcMain.on('window-visibility-changed', (_event, visible: boolean) => {
    updateWindowVisibility(visible)
  })

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

  // Handle YouTube download
  ipcMain.handle('download-youtube', async (event, url: string, outputPath: string) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    
    try {
      const result = await downloadYouTubeAudio({
        url,
        outputPath,
        onProgress: (progress) => {
          // Send progress updates to renderer
          window?.webContents.send('download-progress', progress)
        },
        onBinaryProgress: (progress) => {
          // Send binary download progress updates to renderer
          window?.webContents.send('binary-download-progress', progress)
        },
        onTitleReceived: (title) => {
          // Send video title to renderer
          window?.webContents.send('download-title', title)
        },
      })

      return result
    } catch (error) {
      console.error('YouTube download error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  // Handle get settings
  ipcMain.handle('get-settings', async () => {
    try {
      return getStoredSettings()
    } catch (error) {
      console.error('Error getting settings:', error)
      return {
        musicFolderPath: null,
        downloadFolderPath: null,
      }
    }
  })

  // Handle save settings
  ipcMain.handle('save-settings', async (_event, settings: { musicFolderPath: string | null; downloadFolderPath: string | null }) => {
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

  // Handle get binary statuses
  // Note: FFmpeg binary management was removed. Only yt-dlp status is checked.
  ipcMain.handle('get-binary-statuses', async () => {
    try {
      return await getAllBinaryStatuses()
    } catch (error) {
      console.error('Error getting binary statuses:', error)
      return []
    }
  })

  // Handle get platform info
  ipcMain.handle('get-platform-info', async () => {
    return {
      platform: process.platform,
      arch: process.arch,
    }
  })

  // Handle read file as buffer (for fingerprint generation)
  ipcMain.handle('read-file-buffer', async (_event, filePath: string) => {
    try {
      const buffer = fs.readFileSync(filePath)
      return Array.from(buffer) // Convert Buffer to array for IPC transfer
    } catch (error) {
      console.error('Error reading file:', error)
      throw error
    }
  })
}
