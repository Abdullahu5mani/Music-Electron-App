import { ipcMain, BrowserWindow } from 'electron'
import { downloadYouTubeAudio } from '../../youtubeDownloader'
import { getAllBinaryStatuses } from '../../binaryManager'

/**
 * Registers IPC handlers for YouTube download operations
 * - YouTube audio download with progress tracking
 * - Binary status checking (yt-dlp)
 */
export function registerYoutubeHandlers() {
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

  // Handle get binary statuses (yt-dlp status)
  ipcMain.handle('get-binary-statuses', async () => {
    try {
      return await getAllBinaryStatuses()
    } catch (error) {
      console.error('Error getting binary statuses:', error)
      return []
    }
  })
}

