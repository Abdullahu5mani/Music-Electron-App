import { ipcMain, BrowserWindow, dialog, app } from 'electron'
import path from 'path'
import axios from 'axios'
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
      return buffer // Returns Buffer (Uint8Array) efficiently
    } catch (error) {
      console.error('Error reading file:', error)
      throw error
    }
  })

  // Handle image download
  ipcMain.handle('download-image', async (_event, url: string, filePath: string) => {
    try {
      const response = await axios.get(url, { responseType: 'arraybuffer' })
      const buffer = Buffer.from(response.data)

      let targetPath = filePath

      // If saving to assets, resolve relative to userData
      if (filePath.startsWith('assets/')) {
        const userDataPath = app.getPath('userData')
        targetPath = path.join(userDataPath, filePath)

        // Ensure directory exists
        const dir = path.dirname(targetPath)
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true })
        }
      }

      fs.writeFileSync(targetPath, buffer)
      console.log('Image saved to:', targetPath)
      return { success: true }
    } catch (error) {
      console.error('Error downloading image:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  // Handle writing cover art to file
  ipcMain.handle('write-cover-art', async (_event, filePath: string, imagePath: string) => {
    try {
      const { TagLib } = await import('taglib-wasm')
      const taglib = await TagLib.initialize()

      // Read file into buffer (Sandwich method)
      // This avoids virtual FS issues by operating on memory buffers
      const fileBuffer = fs.readFileSync(filePath)
      const data = new Uint8Array(fileBuffer)
      const file = await taglib.open(data)

      let resolvedImagePath = imagePath
      if (imagePath.startsWith('assets/')) {
        const userDataPath = app.getPath('userData')
        resolvedImagePath = path.join(userDataPath, imagePath)
      }

      console.log('File format detected:', file.getFormat())

      const imageBuffer = fs.readFileSync(resolvedImagePath)
      const imageUint8 = new Uint8Array(imageBuffer)

      // Better MIME detection
      const ext = path.extname(resolvedImagePath).toLowerCase()
      const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg'

      const picture: any = {
        mimeType: mimeType,
        data: imageUint8,
        type: 'Cover (front)',
        description: 'Cover Art'
      }

      console.log('Writing picture with size:', imageBuffer.length, 'MIME:', mimeType)

      // Force tag creation if empty first
      const tag = file.tag()
      if (!tag.title) {
        console.log('Title empty, setting placeholder to force tag creation (using filename)')
        tag.setTitle(path.basename(filePath, path.extname(filePath)))
      }

      // Use setPictures to force replace
      file.setPictures([picture])

      // Save changes to the memory buffer
      if (!file.save()) {
        throw new Error('TagLib failed to save changes to memory buffer')
      }

      // Retrieve the updated buffer and write it back to disk
      const updatedBuffer = file.getFileBuffer()
      fs.writeFileSync(filePath, updatedBuffer)

      file.dispose()

      // Debug read back verification removed for production/speed, but can be re-enabled if needed.

      console.log('Cover art written to disk:', filePath)
      return { success: true }
    } catch (error) {
      console.error('Error writing cover art:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })
}
