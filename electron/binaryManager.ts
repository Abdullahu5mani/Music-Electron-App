import fs from 'fs'
import path from 'path'
import https from 'https'
import { app } from 'electron'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { createRequire } from 'module'

const execFileAsync = promisify(execFile)

// Create require function for ES modules compatibility
const require = createRequire(import.meta.url)

// Try to import @ffmpeg-installer/ffmpeg (may not be available in all environments)
let ffmpegInstaller: { path: string; version: string } | null = null
try {
  ffmpegInstaller = require('@ffmpeg-installer/ffmpeg')
} catch (error) {
  console.warn('@ffmpeg-installer/ffmpeg not available:', error)
}

export interface BinaryStatus {
  name: string
  installed: boolean
  version: string | null
  path: string | null
  latestVersion: string | null
  needsUpdate: boolean
}

/**
 * Gets the binary directory path for a given binary name
 */
function getBinaryDir(binaryName: string): string {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, `${binaryName}-binaries`)
}

/**
 * Gets the binary file path for a given binary name
 */
function getBinaryPath(binaryName: string): string {
  const binaryDir = getBinaryDir(binaryName)
  let binaryFileName: string
  
  if (binaryName === 'yt-dlp') {
    // yt-dlp has architecture-specific names
    if (process.platform === 'win32') {
      binaryFileName = process.arch === 'arm64' ? 'yt-dlp_win_arm64.exe' : 'yt-dlp.exe'
    } else if (process.platform === 'darwin') {
      binaryFileName = process.arch === 'arm64' ? 'yt-dlp_macos_arm64' : 'yt-dlp_macos'
    } else {
      // Linux
      binaryFileName = process.arch === 'arm64' ? 'yt-dlp_linux_arm64' : 'yt-dlp_linux'
    }
  } else {
    // Other binaries use standard naming
    binaryFileName = process.platform === 'win32' 
      ? `${binaryName}.exe` 
      : binaryName
  }
  
  return path.join(binaryDir, binaryFileName)
}

/**
 * Gets the installed version of a binary
 */
async function getInstalledVersion(binaryPath: string): Promise<string | null> {
  try {
    if (!fs.existsSync(binaryPath)) {
      return null
    }
    const { stdout } = await execFileAsync(binaryPath, ['--version'])
    // FFmpeg outputs version in format: "ffmpeg version 4.4.2..."
    // Extract just the version number
    const versionMatch = stdout.match(/version\s+([^\s]+)/i)
    if (versionMatch) {
      return versionMatch[1]
    }
    return stdout.trim().split('\n')[0] || null
  } catch (error) {
    console.error(`Failed to get installed version for ${binaryPath}:`, error)
    return null
  }
}

/**
 * Gets the latest version from GitHub releases (for yt-dlp)
 */
async function getLatestVersionFromGitHub(repo: string): Promise<string | null> {
  try {
    return new Promise((resolve, reject) => {
      https.get(`https://api.github.com/repos/${repo}/releases/latest`, {
        headers: { 'User-Agent': 'music-sync-app' }
      }, (res) => {
        let data = ''
        res.on('data', (chunk) => { data += chunk })
        res.on('end', () => {
          try {
            const release = JSON.parse(data)
            resolve(release.tag_name || null)
          } catch (e) {
            reject(e)
          }
        })
      }).on('error', reject)
    })
  } catch (error) {
    console.error(`Failed to get latest version from GitHub for ${repo}:`, error)
    return null
  }
}

/**
 * Gets the status of yt-dlp binary
 */
export async function getYtDlpStatus(): Promise<BinaryStatus> {
  const binaryName = 'yt-dlp'
  const binaryPath = getBinaryPath(binaryName)
  const installed = fs.existsSync(binaryPath)
  
  let version: string | null = null
  let latestVersion: string | null = null
  
  if (installed) {
    version = await getInstalledVersion(binaryPath)
  }
  
  // Get latest version from GitHub
  latestVersion = await getLatestVersionFromGitHub('yt-dlp/yt-dlp')
  
  const needsUpdate = installed && version && latestVersion && version !== latestVersion
  
  return {
    name: 'yt-dlp',
    installed,
    version,
    path: installed ? binaryPath : null,
    latestVersion,
    needsUpdate: needsUpdate || false,
  }
}

/**
 * Gets the FFmpeg binary path from @ffmpeg-installer/ffmpeg
 * Handles Electron asar packaging
 */
function getFfmpegPath(): string | null {
  if (!ffmpegInstaller) {
    return null
  }
  
  let ffmpegPath = ffmpegInstaller.path
  
  // Handle Electron asar packaging (as mentioned in @ffmpeg-installer/ffmpeg docs)
  if (ffmpegPath.includes('app.asar')) {
    ffmpegPath = ffmpegPath.replace('app.asar', 'app.asar.unpacked')
  }
  
  // Check if the path actually exists
  if (fs.existsSync(ffmpegPath)) {
    return ffmpegPath
  }
  
  return null
}

/**
 * Gets the status of FFmpeg binary
 */
export async function getFfmpegStatus(): Promise<BinaryStatus> {
  const binaryName = 'ffmpeg'
  const ffmpegPath = getFfmpegPath()
  const installed = ffmpegPath !== null && fs.existsSync(ffmpegPath)
  
  let version: string | null = null
  let latestVersion: string | null = null
  
  if (installed && ffmpegPath) {
    // Try to get version from the installer first
    if (ffmpegInstaller?.version) {
      version = ffmpegInstaller.version
    } else {
      // Fallback: run ffmpeg --version
      version = await getInstalledVersion(ffmpegPath)
    }
  }
  
  // FFmpeg doesn't have a simple "latest version" API like GitHub releases
  // The @ffmpeg-installer/ffmpeg package provides a specific version
  // We'll mark it as "up to date" if installed (since it's managed by the package)
  latestVersion = version
  
  return {
    name: 'ffmpeg',
    installed,
    version,
    path: installed ? ffmpegPath : null,
    latestVersion,
    needsUpdate: false, // Managed by npm package, always up to date
  }
}

/**
 * Gets status for all managed binaries
 */
export async function getAllBinaryStatuses(): Promise<BinaryStatus[]> {
  const statuses: BinaryStatus[] = []
  
  // Add yt-dlp status
  statuses.push(await getYtDlpStatus())
  
  // Add FFmpeg status
  statuses.push(await getFfmpegStatus())
  
  // Future binaries can be added here:
  // statuses.push(await getFpcalcStatus())
  
  return statuses
}

