import fs from 'fs'
import path from 'path'
import https from 'https'
import { app } from 'electron'
import { execFile } from 'child_process'
import { promisify } from 'util'

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
 */
async function getInstalledVersion(binaryPath: string): Promise<string | null> {
  try {
    if (!fs.existsSync(binaryPath)) {
      return null
    }
    const { stdout } = await execFileAsync(binaryPath, ['--version'])
    return stdout.trim() || null
  } catch (error) {
    console.error(`Failed to get installed version for ${binaryPath}:`, error)
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
  const installed = fs.existsSync(binaryPath)
  
  let version: string | null = null
  let latestVersion: string | null = null
  
  if (installed) {
    version = await getInstalledVersion(binaryPath)
  }
  
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
 * Gets status for all managed binaries
 */
export async function getAllBinaryStatuses(): Promise<BinaryStatus[]> {
  const statuses: BinaryStatus[] = []
  
  // Add yt-dlp status
  statuses.push(await getYtDlpStatus())
  
  return statuses
}
