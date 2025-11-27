import YTDlpWrap from 'yt-dlp-wrap'
import path from 'path'
import fs from 'fs'
import { app } from 'electron'
import https from 'https'

let ytDlpWrap: YTDlpWrap | null = null
let lastDownloadTime: number = 0
const DOWNLOAD_DELAY_MS = 10000 // 10 seconds

export interface BinaryDownloadProgress {
  status: 'checking' | 'not-found' | 'downloading' | 'downloaded' | 'installed'
  message: string
  percentage?: number
}

/**
 * Downloads yt-dlp binary with progress tracking
 */
async function downloadBinaryWithProgress(
  binaryPath: string,
  onProgress?: (progress: BinaryDownloadProgress) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Get latest release info
    const getLatestRelease = () => {
      return new Promise<any>((resolveRelease, rejectRelease) => {
        https.get('https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest', {
          headers: { 'User-Agent': 'music-sync-app' }
        }, (res) => {
          let data = ''
          res.on('data', (chunk) => { data += chunk })
          res.on('end', () => {
            try {
              resolveRelease(JSON.parse(data))
            } catch (e) {
              rejectRelease(e)
            }
          })
        }).on('error', rejectRelease)
      })
    }

    getLatestRelease()
      .then(async (release) => {
        // Find the right asset for Windows
        const asset = release.assets.find((a: any) => 
          process.platform === 'win32' 
            ? a.name.includes('yt-dlp.exe')
            : a.name.includes('yt-dlp') && !a.name.includes('.exe')
        )

        if (!asset) {
          reject(new Error('Binary not found in release'))
          return
        }

        onProgress?.({
          status: 'downloading',
          message: 'yt-dlp binary downloading...',
          percentage: 0
        })

        // Download the binary
        const file = fs.createWriteStream(binaryPath)
        let downloadedBytes = 0
        const totalBytes = asset.size

        const request = https.get(asset.browser_download_url, {
          headers: { 'User-Agent': 'music-sync-app' }
        }, (res) => {
          res.on('data', (chunk) => {
            downloadedBytes += chunk.length
            const percentage = totalBytes > 0 ? (downloadedBytes / totalBytes) * 100 : 0
            onProgress?.({
              status: 'downloading',
              message: 'yt-dlp binary downloading...',
              percentage: Math.min(percentage, 99)
            })
            file.write(chunk)
          })

          res.on('end', () => {
            file.end()
            // Make executable on Unix systems
            if (process.platform !== 'win32') {
              fs.chmodSync(binaryPath, 0o755)
            }
            onProgress?.({
              status: 'downloaded',
              message: 'yt-dlp binary downloaded',
              percentage: 100
            })
            resolve()
          })
        })

        request.on('error', (err) => {
          file.close()
          try {
            if (fs.existsSync(binaryPath)) {
              fs.unlinkSync(binaryPath)
            }
          } catch {
            // Ignore errors when deleting
          }
          reject(err)
        })
      })
      .catch(reject)
  })
}

/**
 * Gets or initializes the yt-dlp-wrap instance
 */
async function getYtDlpWrap(
  onBinaryProgress?: (progress: BinaryDownloadProgress) => void
): Promise<YTDlpWrap> {
  if (!ytDlpWrap) {
    const userDataPath = app.getPath('userData')
    const binaryDir = path.join(userDataPath, 'yt-dlp-binaries')
    
    // Ensure binary directory exists
    if (!fs.existsSync(binaryDir)) {
      fs.mkdirSync(binaryDir, { recursive: true })
    }
    
    // Determine binary filename based on platform
    const binaryName = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'
    const binaryPath = path.join(binaryDir, binaryName)
    
    // Check if binary exists, if not, download it
    if (!fs.existsSync(binaryPath)) {
      onBinaryProgress?.({
        status: 'not-found',
        message: 'yt-dlp binary not found'
      })
      
      onBinaryProgress?.({
        status: 'downloading',
        message: 'yt-dlp binary downloading...',
        percentage: 0
      })
      
      try {
        // Use custom download with progress
        await downloadBinaryWithProgress(binaryPath, onBinaryProgress)
        
        onBinaryProgress?.({
          status: 'downloaded',
          message: 'yt-dlp binary downloaded',
          percentage: 100
        })
        
        // Small delay to show the message
        await new Promise(resolve => setTimeout(resolve, 500))
        
        onBinaryProgress?.({
          status: 'installed',
          message: 'yt-dlp binary installed'
        })
      } catch (error) {
        console.error('Failed to download yt-dlp binary:', error)
        throw new Error('Failed to download yt-dlp binary. Please check your internet connection.')
      }
    }
    
    // Initialize with the binary file path (not directory)
    ytDlpWrap = new YTDlpWrap(binaryPath)
  }
  return ytDlpWrap
}

export interface DownloadProgress {
  percentage: number
  downloaded: number
  total: number
  speed: string
  eta: string
}

/**
 * Gets the video title from a YouTube URL
 */
async function getVideoTitle(url: string, ytDlp: YTDlpWrap): Promise<string> {
  try {
    const result = await ytDlp.execPromise([
      url,
      '--get-title',
      '--no-warnings',
    ])
    return result.trim() || 'Unknown Title'
  } catch (error) {
    console.error('Failed to get video title:', error)
    return 'Unknown Title'
  }
}

export interface DownloadOptions {
  url: string
  outputPath: string
  onProgress?: (progress: DownloadProgress) => void
  onBinaryProgress?: (progress: BinaryDownloadProgress) => void
  onTitleReceived?: (title: string) => void
}

/**
 * Downloads audio from YouTube using yt-dlp-wrap
 */
export async function downloadYouTubeAudio(
  options: DownloadOptions
): Promise<{ success: boolean; filePath?: string; error?: string; title?: string }> {
  return new Promise(async (resolve) => {
    try {
      // Check if we need to wait before downloading
      const now = Date.now()
      const timeSinceLastDownload = now - lastDownloadTime
      
      if (timeSinceLastDownload < DOWNLOAD_DELAY_MS && lastDownloadTime > 0) {
        const waitTime = DOWNLOAD_DELAY_MS - timeSinceLastDownload
        options.onBinaryProgress?.({
          status: 'checking',
          message: `Waiting ${Math.ceil(waitTime / 1000)} seconds to avoid rate limiting...`
        })
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
      
      const ytDlp = await getYtDlpWrap(options.onBinaryProgress)
      
      // Update last download time
      lastDownloadTime = Date.now()
      
      // Get video title before downloading
      const videoTitle = await getVideoTitle(options.url, ytDlp)
      options.onTitleReceived?.(videoTitle)
      
      // Ensure output directory exists
      if (!fs.existsSync(options.outputPath)) {
        fs.mkdirSync(options.outputPath, { recursive: true })
      }

      const outputTemplate = path.join(options.outputPath, '%(title)s.%(ext)s')

      // Download with metadata and thumbnail
      const eventEmitter = ytDlp.exec([
        options.url,
        '--extract-audio',
        '--audio-format', 'mp3',
        '--audio-quality', '0',  // Best quality
        '--embed-thumbnail',      // Embed thumbnail
        '--add-metadata',         // Add metadata
        '--write-thumbnail',      // Save thumbnail separately
        '--output', outputTemplate,
        '--newline',
        '--progress',
        '--no-warnings',
      ])

      let downloadedFile: string | null = null
      let hasError = false

      eventEmitter.on('progress', (progress: any) => {
        if (options.onProgress && !hasError) {
          const percent = progress.percent || 0
          const downloaded = progress.downloaded || 0
          const total = progress.total || 0
          const speed = progress.speed || '0 B/s'
          const eta = progress.eta || '--:--'
          
          options.onProgress({
            percentage: percent,
            downloaded,
            total,
            speed: typeof speed === 'string' ? speed : `${speed} B/s`,
            eta: typeof eta === 'string' ? eta : '--:--',
          })
        }
      })

      eventEmitter.on('ytDlpEvent', (eventType: string, eventData: any) => {
        if (eventType === 'download' && eventData.filename) {
          downloadedFile = eventData.filename
        }
      })

      eventEmitter.on('error', (error: Error) => {
        hasError = true
        resolve({
          success: false,
          error: error.message,
        })
      })

      // Wait for completion
      await new Promise<void>((resolvePromise, rejectPromise) => {
        eventEmitter.on('close', (code: number | null) => {
          if (code === 0 || code === null) {
            resolvePromise()
          } else {
            rejectPromise(new Error(`yt-dlp exited with code ${code}`))
          }
        })
        eventEmitter.on('error', rejectPromise)
      })

      // Find the downloaded file
      if (downloadedFile && fs.existsSync(downloadedFile)) {
        resolve({
          success: true,
          filePath: downloadedFile,
          title: videoTitle,
        })
      } else {
        // Fallback: search for the most recently created mp3 file
        const files = fs.readdirSync(options.outputPath)
          .map(f => ({
            name: f,
            path: path.join(options.outputPath, f),
            time: fs.statSync(path.join(options.outputPath, f)).mtime.getTime(),
          }))
          .filter(f => f.name.endsWith('.mp3'))
          .sort((a, b) => b.time - a.time)
        
        if (files.length > 0) {
          resolve({
            success: true,
            filePath: files[0].path,
            title: videoTitle,
          })
        } else {
          resolve({
            success: false,
            error: 'Download completed but file not found',
          })
        }
      }
    } catch (error) {
      resolve({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  })
}

