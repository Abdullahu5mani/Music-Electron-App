import { ipcMain, BrowserWindow, dialog } from 'electron'
import { scanMusicFiles, MUSIC_EXTENSIONS } from '../musicScanner'
import { downloadYouTubeAudio } from '../youtubeDownloader'
import { updatePlaybackState, updateWindowVisibility } from '../tray'
import { getStoredSettings, saveSettings as saveStoredSettings } from '../settings'
import { getAllBinaryStatuses } from '../binaryManager'
import fs from 'fs'
import path from 'path'

/**
 * Validates that a file path is a music file and exists
 * Returns the normalized absolute path if valid, null otherwise
 */
function validateMusicFilePath(filePath: string): string | null {
  if (!filePath || typeof filePath !== 'string') {
    return null
  }
  
  // Normalize the path to resolve any .. or . components
  const normalizedPath = path.resolve(filePath)
  
  // Check if file exists
  if (!fs.existsSync(normalizedPath)) {
    return null
  }
  
  // Check if it's a file (not a directory or symlink to directory)
  try {
    const stats = fs.statSync(normalizedPath)
    if (!stats.isFile()) {
      return null
    }
  } catch {
    return null
  }
  
  // Check if it has a valid music file extension
  const ext = path.extname(normalizedPath).toLowerCase()
  if (!MUSIC_EXTENSIONS.includes(ext)) {
    return null
  }
  
  return normalizedPath
}

/**
 * Validates that a folder path is a valid directory
 * Returns the normalized absolute path if valid, null otherwise
 */
function validateDirectoryPath(folderPath: string): string | null {
  if (!folderPath || typeof folderPath !== 'string') {
    return null
  }
  
  // Normalize the path to resolve any .. or . components
  const normalizedPath = path.resolve(folderPath)
  
  // Check if directory exists
  if (!fs.existsSync(normalizedPath)) {
    return null
  }
  
  // Check if it's a directory
  try {
    const stats = fs.statSync(normalizedPath)
    if (!stats.isDirectory()) {
      return null
    }
  } catch {
    return null
  }
  
  return normalizedPath
}

/**
 * Registers all IPC handlers for communication between main and renderer processes
 */
export function registerIpcHandlers() {
  // Handle music folder scanning
  // Security: Validates that the path is an existing directory
  ipcMain.handle('scan-music-folder', async (_event, folderPath: string) => {
    try {
      const validatedPath = validateDirectoryPath(folderPath)
      if (!validatedPath) {
        throw new Error('Invalid folder path: must be an existing directory')
      }
      return await scanMusicFiles(validatedPath)
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
  // Security: Validates the output path is an existing directory
  ipcMain.handle('download-youtube', async (event, url: string, outputPath: string) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    
    // Validate output path is an existing directory
    const validatedOutputPath = validateDirectoryPath(outputPath)
    if (!validatedOutputPath) {
      return {
        success: false,
        error: 'Invalid output path: must be an existing directory',
      }
    }
    
    try {
      const result = await downloadYouTubeAudio({
        url,
        outputPath: validatedOutputPath,
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
  // Security: Only allows reading validated music files to prevent path traversal attacks
  ipcMain.handle('read-file-buffer', async (_event, filePath: string) => {
    try {
      // Validate that the file path is a valid music file
      const validatedPath = validateMusicFilePath(filePath)
      if (!validatedPath) {
        throw new Error('Invalid file path: must be an existing music file')
      }
      
      const buffer = fs.readFileSync(validatedPath)
      return Array.from(buffer) // Convert Buffer to array for IPC transfer
    } catch (error) {
      console.error('Error reading file:', error)
      throw error
    }
  })
}
