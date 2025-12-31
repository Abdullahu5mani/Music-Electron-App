import YTDlpWrap from 'yt-dlp-wrap'
import path from 'path'
import fs from 'fs'
import { app } from 'electron'
import https from 'https'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)
import { ignoreFile } from './fileWatcher'

let ytDlpWrap: YTDlpWrap | null = null
const DOWNLOAD_DELAY_MS = 10000 // 10 seconds

// Track state
let lastDownloadTime: number = 0
let activeDownloadController: AbortController | null = null

/**
 * Cancels the currently active YouTube download
 */
export function cancelActiveDownload(): boolean {
  console.log('Attempting to cancel active download with AbortController...')
  if (activeDownloadController) {
    try {
      activeDownloadController.abort()
      activeDownloadController = null
      console.log('Successfully called abort() on active download controller')
      return true
    } catch (error) {
      console.error('Failed to abort download:', error)
      activeDownloadController = null
    }
  } else {
    console.log('No active download controller found to cancel')
  }
  return false
}

export interface BinaryDownloadProgress {
  status: 'checking' | 'not-found' | 'downloading' | 'downloaded' | 'installed' | 'updating' | 'version-check'
  message: string
  percentage?: number
}

/**
 * Gets the version of the installed yt-dlp binary
 * Returns null if file doesn't exist or is corrupted/not executable
 */
async function getInstalledVersion(binaryPath: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync(binaryPath, ['--version'], { timeout: 10000 })
    return stdout.trim()
  } catch (error: any) {
    // EFTYPE = file exists but wrong format/corrupted
    // Don't log full error for common cases
    if (error?.code === 'EFTYPE' || error?.code === 'EACCES') {
      console.warn(`Binary cannot be executed (${error.code}). May need reinstall.`)
    } else if (error?.code !== 'ENOENT') {
      console.error('Failed to get installed version:', error?.message || error)
    }
    return null
  }
}

/**
 * Gets the latest version from GitHub releases
 */
async function getLatestVersion(): Promise<string | null> {
  try {
    return new Promise((resolve, reject) => {
      https.get('https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest', {
        headers: { 'User-Agent': 'music-sync-app' }
      }, (res) => {
        let data = ''
        res.on('data', (chunk) => { data += chunk })
        res.on('end', () => {
          try {
            const release = JSON.parse(data)
            // Version is usually in tag_name (e.g., "2024.01.01")
            resolve(release.tag_name || null)
          } catch (e) {
            reject(e)
          }
        })
      }).on('error', reject)
    })
  } catch (error) {
    console.error('Failed to get latest version:', error)
    return null
  }
}

/**
 * Checks if the installed binary is up to date
 */
async function checkBinaryVersion(
  binaryPath: string,
  onProgress?: (progress: BinaryDownloadProgress) => void
): Promise<{ isUpToDate: boolean; installedVersion?: string; latestVersion?: string; needsUpdate: boolean }> {
  onProgress?.({
    status: 'version-check',
    message: 'Checking yt-dlp version...'
  })

  const [installedVersion, latestVersion] = await Promise.all([
    getInstalledVersion(binaryPath),
    getLatestVersion()
  ])

  if (!installedVersion || !latestVersion) {
    return { isUpToDate: false, needsUpdate: false }
  }

  // Compare versions (simple string comparison works for yt-dlp's date-based versions)
  const isUpToDate = installedVersion === latestVersion

  return {
    isUpToDate,
    installedVersion,
    latestVersion,
    needsUpdate: !isUpToDate
  }
}

/**
 * Determines the correct asset name based on platform and architecture
 */
function getAssetNameForPlatform(): string | null {
  const platform = process.platform
  const arch = process.arch

  if (platform === 'win32') {
    // Windows: yt-dlp.exe (x64) or yt-dlp_win_arm64.exe (arm64)
    if (arch === 'arm64') {
      return 'yt-dlp_win_arm64.exe'
    } else {
      // x64 or ia32 (32-bit) - default to x64
      return 'yt-dlp.exe'
    }
  } else if (platform === 'darwin') {
    // macOS: yt-dlp_macos (x64) or yt-dlp_macos_arm64 (arm64)
    if (arch === 'arm64') {
      return 'yt-dlp_macos_arm64'
    } else {
      // x64 (Intel Mac)
      return 'yt-dlp_macos'
    }
  } else if (platform === 'linux') {
    // Linux: yt-dlp_linux (x64) or yt-dlp_linux_arm64 (arm64)
    if (arch === 'arm64') {
      return 'yt-dlp_linux_arm64'
    } else {
      return 'yt-dlp_linux'
    }
  }

  return null
}

/**
 * Finds the correct asset from GitHub release assets
 */
function findAssetForPlatform(assets: any[]): any | null {
  const targetAssetName = getAssetNameForPlatform()

  if (!targetAssetName) {
    console.error(`Unsupported platform: ${process.platform} ${process.arch}`)
    return null
  }

  // First, try exact match
  let asset = assets.find((a: any) => a.name === targetAssetName)

  if (asset) {
    return asset
  }

  // Fallback: try partial match (in case naming changes)
  const platform = process.platform
  const arch = process.arch

  if (platform === 'win32') {
    if (arch === 'arm64') {
      // Look for Windows ARM64
      asset = assets.find((a: any) =>
        a.name.includes('yt-dlp') &&
        a.name.includes('win') &&
        (a.name.includes('arm64') || a.name.includes('arm'))
      )
    } else {
      // Look for Windows x64 (default .exe)
      asset = assets.find((a: any) =>
        a.name === 'yt-dlp.exe' ||
        (a.name.includes('yt-dlp') && a.name.includes('.exe') && !a.name.includes('arm'))
      )
    }
  } else if (platform === 'darwin') {
    if (arch === 'arm64') {
      // Look for macOS ARM64 (Apple Silicon)
      asset = assets.find((a: any) =>
        a.name.includes('yt-dlp') &&
        a.name.includes('macos') &&
        (a.name.includes('arm64') || a.name.includes('arm') || a.name.includes('m1') || a.name.includes('m2'))
      )
    } else {
      // Look for macOS x64 (Intel)
      asset = assets.find((a: any) =>
        a.name.includes('yt-dlp') &&
        a.name.includes('macos') &&
        !a.name.includes('arm') &&
        !a.name.includes('.exe')
      )
    }
  } else if (platform === 'linux') {
    if (arch === 'arm64') {
      asset = assets.find((a: any) =>
        a.name.includes('yt-dlp') &&
        a.name.includes('linux') &&
        (a.name.includes('arm64') || a.name.includes('arm'))
      )
    } else {
      asset = assets.find((a: any) =>
        a.name.includes('yt-dlp') &&
        a.name.includes('linux') &&
        !a.name.includes('arm') &&
        !a.name.includes('.exe')
      )
    }
  }

  return asset || null
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
        // Find the correct asset based on platform and architecture
        const asset = findAssetForPlatform(release.assets)

        if (!asset) {
          const platform = process.platform
          const arch = process.arch
          const availableAssets = release.assets.map((a: any) => a.name).join(', ')
          console.error(`Binary not found for platform: ${platform} (${arch})`)
          console.error(`Available assets: ${availableAssets}`)
          reject(new Error(`Binary not found for platform: ${platform} (${arch}). Available assets: ${availableAssets}`))
          return
        }

        console.log(`Downloading yt-dlp binary: ${asset.name} for ${process.platform} (${process.arch})`)

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
 * Checks version and updates if needed
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

    // Determine binary filename based on platform and architecture
    let binaryName: string
    if (process.platform === 'win32') {
      binaryName = process.arch === 'arm64' ? 'yt-dlp_win_arm64.exe' : 'yt-dlp.exe'
    } else if (process.platform === 'darwin') {
      binaryName = process.arch === 'arm64' ? 'yt-dlp_macos_arm64' : 'yt-dlp_macos'
    } else {
      // Linux
      binaryName = process.arch === 'arm64' ? 'yt-dlp_linux_arm64' : 'yt-dlp_linux'
    }
    const binaryPath = path.join(binaryDir, binaryName)

    // Check if binary exists
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
    } else {
      // Binary exists, check if it's up to date
      const versionCheck = await checkBinaryVersion(binaryPath, onBinaryProgress)

      if (versionCheck.needsUpdate && versionCheck.installedVersion && versionCheck.latestVersion) {
        onBinaryProgress?.({
          status: 'updating',
          message: `Updating yt-dlp from ${versionCheck.installedVersion} to ${versionCheck.latestVersion}...`,
          percentage: 0
        })

        try {
          // Download latest version (overwrites existing)
          await downloadBinaryWithProgress(binaryPath, onBinaryProgress)

          onBinaryProgress?.({
            status: 'downloaded',
            message: `yt-dlp updated to ${versionCheck.latestVersion}`,
            percentage: 100
          })

          // Small delay to show the message
          await new Promise(resolve => setTimeout(resolve, 500))

          onBinaryProgress?.({
            status: 'installed',
            message: 'yt-dlp binary updated'
          })
        } catch (error) {
          console.error('Failed to update yt-dlp binary:', error)
          // Continue with existing binary if update fails
          onBinaryProgress?.({
            status: 'checking',
            message: 'Update failed, using existing version'
          })
        }
      } else if (versionCheck.isUpToDate && versionCheck.installedVersion) {
        onBinaryProgress?.({
          status: 'checking',
          message: `yt-dlp is up to date (${versionCheck.installedVersion}). Starting download...`
        })
        // Small delay to show the message
        await new Promise(resolve => setTimeout(resolve, 500))
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
    // Optimization: only get the first title and use --flat-playlist for speed
    const isPlaylist = url.includes('list=') && !url.includes('v=')

    const args = [
      url,
      '--get-title',
      '--no-warnings',
      '--ignore-errors',
      '--playlist-items', '1', // Only get the first title to be fast
      '--flat-playlist'        // Don't extract full info, just list it
    ]

    const result = await ytDlp.execPromise(args)

    if (!result || result.trim() === '') {
      return 'YouTube Content'
    }

    const titles = result.trim().split('\n')
    const baseTitle = titles[0] || 'Unknown Title'

    if (isPlaylist) {
      return `Playlist: ${baseTitle}...`
    }

    return baseTitle
  } catch (error) {
    console.error('Failed to get video title:', error)
    return 'YouTube Content'
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
      // First, ensure we have the latest binary version
      // This will check version and update if needed
      const ytDlp = await getYtDlpWrap(options.onBinaryProgress)

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

      // Create a new AbortController for this download
      activeDownloadController = new AbortController()

      console.log(`[YouTube] Starting download for: ${options.url}`)

      // Emit initial status
      if (options.onProgress) {
        options.onProgress({
          percentage: 0,
          downloaded: 0,
          total: 0,
          speed: 'Starting...',
          eta: '--:--'
        })
      }

      const args = [
        options.url,
        '--extract-audio',
        '--audio-format', 'mp3',
        '--audio-quality', '0',   // Best quality
        '--embed-thumbnail',       // Embed thumbnail
        '--add-metadata',          // Add metadata
        '--output', outputTemplate,
        '--newline',               // Important for parsing progress
        '--progress',
        '--no-warnings',
        '--ignore-errors',         // Skip unavailable videos
        '--no-check-certificates', // Avoid SSL issues
        '--verbose'               // Add verbose logging to see what's happening
      ]

      // Download with metadata and thumbnail
      const eventEmitter = ytDlp.exec(args)

      // Store a reference to the process for manual killing if needed
      const childProcess = eventEmitter.ytDlpProcess

      // Manual abort handling
      const abortHandler = () => {
        if (childProcess && childProcess.pid) {
          console.log(`[Abort] Signal received. Killing PID: ${childProcess.pid}`)
          try {
            if (process.platform === 'win32') {
              const { exec } = require('child_process')
              // /F = Force, /T = Tree (kill children), /PID = Process ID
              // 2>NUL suppresses the "Process not found" error output
              exec(`taskkill /F /T /PID ${childProcess.pid} >NUL 2>&1`, (err: any) => {
                // If there's an error, it might just mean the process is already gone
                if (err) console.log(`[Abort] Process ${childProcess.pid} cleanup: Process might already be dead.`)
                else console.log(`[Abort] Successfully killed process tree ${childProcess.pid}`)
              })
            } else {
              childProcess.kill('SIGKILL')
              console.log(`[Abort] Sent SIGKILL to ${childProcess.pid}`)
            }
          } catch (e) {
            console.error(`[Abort] Error killing process:`, e)
          }
        } else {
          console.log('[Abort] No child process or PID found to kill.')
        }
      }

      if (activeDownloadController) {
        activeDownloadController.signal.addEventListener('abort', abortHandler)
      }

      let downloadedFile: string | null = null
      let hasError = false
      let lastProgressUpdate = Date.now()

      // Removed manual stdout/stderr logging listeners as they might interfere 
      // with yt-dlp-wrap's internal progress parsing mechanisms.
      // If we need debugging, we can rely on the verbose flag we added to args.

      eventEmitter.on('progress', (progress: any) => {
        // Throttle updates to every 100ms to avoid flooding UI
        if (Date.now() - lastProgressUpdate < 100) return
        lastProgressUpdate = Date.now()

        if (options.onProgress && !hasError) {
          const percent = progress.percent || 0
          const downloaded = progress.downloaded || 0
          const total = progress.total || 0
          const speed = progress.speed || '0 B/s'
          const eta = progress.eta || '--:--'

          // console.log(`[YouTube] Progress: ${percent}% ${speed}`)

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
          // Tell file watcher to ignore this file while we're writing it
          if (downloadedFile) {
            ignoreFile(downloadedFile)
          }
        }
      })

      eventEmitter.on('error', (error: Error) => {
        hasError = true
        console.error('[YouTube] Download Error Event:', error)

        // Clean up abort listener
        if (activeDownloadController) {
          activeDownloadController.signal.removeEventListener('abort', abortHandler)
          activeDownloadController = null
        }

        // Standardize error message
        resolve({
          success: false,
          error: error.message || 'Unknown download error',
        })
      })

      // Wait for completion
      await new Promise<void>((resolvePromise) => {
        eventEmitter.on('close', (code: number | null) => {
          console.log(`[YouTube] Download process closed with code: ${code}`)

          // Clean up abort listener
          if (activeDownloadController) {
            activeDownloadController.signal.removeEventListener('abort', abortHandler)
            activeDownloadController = null
          }
          // With --ignore-errors, yt-dlp might exit with code 1 if some videos failed
          // but others succeeded. We consider it "done" and check for files afterwards.
          if (code === 0 || code === 1 || code === null) {
            resolvePromise()
          } else {
            // Only reject on actual fatal errors (e.g. command not found, etc.)
            // though most of those are caught by the 'error' handler
            resolvePromise()
          }
        })
      })

      // Find the downloaded file
      if (downloadedFile && fs.existsSync(downloadedFile)) {
        // Final absolute cleanup: remove any leftover junk files in the output directory
        // that might have been created by yt-dlp or ffmpeg
        try {
          const files = fs.readdirSync(options.outputPath)
          const junkExtensions = ['.webp', '.webm', '.vtt', '.description', '.info.json', '.ytdl', '.part', '.temp']

          for (const file of files) {
            if (junkExtensions.some(ext => file.endsWith(ext))) {
              const filePath = path.join(options.outputPath, file)
              // Check if it was created very recently (within the last 2 minutes)
              const stats = fs.statSync(filePath)
              const now = Date.now()
              if (now - stats.mtimeMs < 120000) {
                fs.unlinkSync(filePath)
                console.log(`Cleaned up leftover junk file: ${file}`)
              }
            }
          }
        } catch (cleanupError) {
          console.error('Error during final cleanup:', cleanupError)
        }

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

