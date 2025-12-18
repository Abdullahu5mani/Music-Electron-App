import fs from 'fs'
import path from 'path'
import https from 'https'
import { app } from 'electron'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { getFpcalcPath, isFpcalcInstalled } from './fpcalcManager'
import { getWhisperPath, getWhisperModelPath, isWhisperInstalled, getWhisperVersion } from './whisperManager'

const execFileAsync = promisify(execFile)

export interface BinaryStatus {
  name: string
  installed: boolean
  version: string | null
  path: string | null
  latestVersion: string | null
  needsUpdate: boolean
}

/**
 * Gets the binary directory path for yt-dlp
 */
function getBinaryDir(): string {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, 'yt-dlp-binaries')
}

/**
 * Gets the binary file path for yt-dlp
 */
function getBinaryPath(): string {
  const binaryDir = getBinaryDir()
  let binaryFileName: string

  if (process.platform === 'win32') {
    binaryFileName = process.arch === 'arm64' ? 'yt-dlp_win_arm64.exe' : 'yt-dlp.exe'
  } else if (process.platform === 'darwin') {
    binaryFileName = process.arch === 'arm64' ? 'yt-dlp_macos_arm64' : 'yt-dlp_macos'
  } else {
    // Linux
    binaryFileName = process.arch === 'arm64' ? 'yt-dlp_linux_arm64' : 'yt-dlp_linux'
  }

  return path.join(binaryDir, binaryFileName)
}

/**
 * Gets the installed version of yt-dlp binary
 * Returns null if file doesn't exist or is corrupted/not executable
 */
async function getInstalledVersion(binaryPath: string): Promise<string | null> {
  try {
    if (!fs.existsSync(binaryPath)) {
      return null
    }
    const { stdout } = await execFileAsync(binaryPath, ['--version'], { timeout: 10000 })
    return stdout.trim() || null
  } catch (error: any) {
    // EFTYPE = file exists but wrong format/corrupted
    // EACCES = permission denied
    // ENOENT = file not found
    if (error?.code === 'EFTYPE' || error?.code === 'EACCES') {
      console.warn(`Binary at ${binaryPath} exists but cannot be executed (${error.code}). May be corrupted.`)
      // Optionally delete the corrupted file
      try {
        fs.unlinkSync(binaryPath)
        console.log(`Deleted corrupted binary: ${binaryPath}`)
      } catch (deleteError) {
        console.error(`Failed to delete corrupted binary:`, deleteError)
      }
    } else {
      console.error(`Failed to get installed version for ${binaryPath}:`, error?.message || error)
    }
    return null
  }
}

/**
 * Gets the installed version of fpcalc binary
 */
async function getFpcalcVersion(binaryPath: string): Promise<string | null> {
  try {
    if (!fs.existsSync(binaryPath)) {
      return null
    }
    const { stdout } = await execFileAsync(binaryPath, ['-version'], { timeout: 5000 })
    // fpcalc outputs: "fpcalc version 1.5.1"
    const match = stdout.match(/fpcalc version (\S+)/)
    return match ? match[1] : stdout.trim() || null
  } catch (error: any) {
    console.error(`Failed to get fpcalc version:`, error?.message || error)
    return null
  }
}

/**
 * Gets the latest version from GitHub releases (for yt-dlp)
 */
async function getLatestVersionFromGitHub(): Promise<string | null> {
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
            resolve(release.tag_name || null)
          } catch (e) {
            reject(e)
          }
        })
      }).on('error', reject)
    })
  } catch (error) {
    console.error('Failed to get latest version from GitHub:', error)
    return null
  }
}

/**
 * Gets the status of yt-dlp binary
 */
export async function getYtDlpStatus(): Promise<BinaryStatus> {
  const binaryPath = getBinaryPath()
  const fileExists = fs.existsSync(binaryPath)

  let version: string | null = null
  let latestVersion: string | null = null

  if (fileExists) {
    version = await getInstalledVersion(binaryPath)
  }

  // Binary is only truly "installed" if we can get its version
  // (file might exist but be corrupted/not executable)
  const installed = fileExists && version !== null

  // Get latest version from GitHub
  latestVersion = await getLatestVersionFromGitHub()

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
 * Gets the status of fpcalc binary
 */
export async function getFpcalcStatus(): Promise<BinaryStatus> {
  const binaryPath = getFpcalcPath()
  const installed = await isFpcalcInstalled()

  let version: string | null = null
  if (installed) {
    version = await getFpcalcVersion(binaryPath)
  }

  // fpcalc version is fixed at what we download (1.6.0)
  // We don't have an easy way to check for updates
  const latestVersion = '1.6.0'

  return {
    name: 'fpcalc (Chromaprint)',
    installed,
    version,
    path: installed ? binaryPath : null,
    latestVersion,
    needsUpdate: false, // We don't auto-update fpcalc
  }
}

/**
 * Gets the status of whisper.cpp binary
 */
export async function getWhisperStatus(): Promise<BinaryStatus> {
  const binaryPath = getWhisperPath()
  const modelPath = getWhisperModelPath()
  const installed = await isWhisperInstalled()

  let version: string | null = null
  if (installed) {
    version = await getWhisperVersion()
  }

  // Check if both binary and model exist
  const hasModel = fs.existsSync(modelPath)

  // Whisper version we download
  const latestVersion = '1.8.2'

  return {
    name: 'whisper.cpp (Transcription)',
    installed: installed && hasModel,
    version,
    path: installed ? binaryPath : null,
    latestVersion,
    needsUpdate: false, // We don't auto-update whisper
  }
}

/**
 * Gets status for all managed binaries
 */
export async function getAllBinaryStatuses(): Promise<BinaryStatus[]> {
  const statuses: BinaryStatus[] = []

  // Add yt-dlp status
  statuses.push(await getYtDlpStatus())

  // Add fpcalc status
  statuses.push(await getFpcalcStatus())

  // Add whisper status
  statuses.push(await getWhisperStatus())

  return statuses
}
