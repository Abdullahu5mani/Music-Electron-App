/**
 * fpcalc Binary Manager
 * 
 * Manages the fpcalc (Chromaprint) binary for audio fingerprinting.
 * This runs in the Main Process and avoids the WASM memory issues
 * that occur when running fingerprinting in the Renderer.
 */

import fs from 'fs'
import path from 'path'
import https from 'https'
import { app } from 'electron'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { createWriteStream } from 'fs'
import * as tar from 'tar'

const execFileAsync = promisify(execFile)

// Chromaprint version to download
const CHROMAPRINT_VERSION = '1.5.1'

// Download URLs for different platforms
const DOWNLOAD_URLS: Record<string, string> = {
    'win32-x64': `https://github.com/acoustid/chromaprint/releases/download/v${CHROMAPRINT_VERSION}/chromaprint-fpcalc-${CHROMAPRINT_VERSION}-windows-x86_64.zip`,
    'darwin-x64': `https://github.com/acoustid/chromaprint/releases/download/v${CHROMAPRINT_VERSION}/chromaprint-fpcalc-${CHROMAPRINT_VERSION}-macos-x86_64.tar.gz`,
    'darwin-arm64': `https://github.com/acoustid/chromaprint/releases/download/v${CHROMAPRINT_VERSION}/chromaprint-fpcalc-${CHROMAPRINT_VERSION}-macos-arm64.tar.gz`,
    'linux-x64': `https://github.com/acoustid/chromaprint/releases/download/v${CHROMAPRINT_VERSION}/chromaprint-fpcalc-${CHROMAPRINT_VERSION}-linux-x86_64.tar.gz`,
}

/**
 * Gets the fpcalc binary directory
 */
function getFpcalcDir(): string {
    const userDataPath = app.getPath('userData')
    return path.join(userDataPath, 'fpcalc-binary')
}

/**
 * Gets the fpcalc binary path
 */
export function getFpcalcPath(): string {
    const binaryDir = getFpcalcDir()
    const binaryName = process.platform === 'win32' ? 'fpcalc.exe' : 'fpcalc'
    return path.join(binaryDir, binaryName)
}

/**
 * Check if fpcalc is installed and working
 */
export async function isFpcalcInstalled(): Promise<boolean> {
    const binaryPath = getFpcalcPath()

    if (!fs.existsSync(binaryPath)) {
        return false
    }

    try {
        await execFileAsync(binaryPath, ['-version'], { timeout: 5000 })
        return true
    } catch (error) {
        console.error('fpcalc exists but failed to execute:', error)
        return false
    }
}

/**
 * Download and extract fpcalc binary
 */
export async function downloadFpcalc(
    onProgress?: (message: string, percentage?: number) => void
): Promise<boolean> {
    const platformKey = `${process.platform}-${process.arch}`
    const downloadUrl = DOWNLOAD_URLS[platformKey]

    if (!downloadUrl) {
        console.error(`No fpcalc download available for platform: ${platformKey}`)
        onProgress?.(`No fpcalc available for ${platformKey}`, 0)
        return false
    }

    const binaryDir = getFpcalcDir()
    const binaryPath = getFpcalcPath()

    // Create directory if it doesn't exist
    if (!fs.existsSync(binaryDir)) {
        fs.mkdirSync(binaryDir, { recursive: true })
    }

    onProgress?.('Downloading fpcalc...', 10)

    try {
        const tempFile = path.join(binaryDir, 'fpcalc-download.tmp')

        // Download the file
        await new Promise<void>((resolve, reject) => {
            const file = createWriteStream(tempFile)

            const request = (url: string) => {
                https.get(url, {
                    headers: { 'User-Agent': 'MusicSyncApp/1.0.0' }
                }, (response) => {
                    // Handle redirects
                    if (response.statusCode === 302 || response.statusCode === 301) {
                        const redirectUrl = response.headers.location
                        if (redirectUrl) {
                            request(redirectUrl)
                            return
                        }
                    }

                    if (response.statusCode !== 200) {
                        reject(new Error(`Failed to download: HTTP ${response.statusCode}`))
                        return
                    }

                    response.pipe(file)
                    file.on('finish', () => {
                        file.close()
                        resolve()
                    })
                }).on('error', (err) => {
                    fs.unlink(tempFile, () => { })
                    reject(err)
                })
            }

            request(downloadUrl)
        })

        onProgress?.('Extracting fpcalc...', 50)

        // Extract based on file type
        if (downloadUrl.endsWith('.zip')) {
            // Windows: unzip
            const AdmZip = (await import('adm-zip')).default
            const zip = new AdmZip(tempFile)
            const entries = zip.getEntries()

            // Find fpcalc.exe in the zip
            for (const entry of entries) {
                if (entry.entryName.endsWith('fpcalc.exe')) {
                    fs.writeFileSync(binaryPath, entry.getData())
                    break
                }
            }
        } else if (downloadUrl.endsWith('.tar.gz')) {
            // macOS/Linux: extract tar.gz
            await tar.x({
                file: tempFile,
                cwd: binaryDir,
                strip: 1, // Remove top-level directory
                filter: (path) => path.endsWith('fpcalc')
            })
        }

        // Clean up temp file
        fs.unlinkSync(tempFile)

        // Make executable on Unix
        if (process.platform !== 'win32' && fs.existsSync(binaryPath)) {
            fs.chmodSync(binaryPath, 0o755)
        }

        // Verify installation
        const installed = await isFpcalcInstalled()
        if (installed) {
            onProgress?.('fpcalc installed successfully', 100)
            return true
        } else {
            onProgress?.('fpcalc installation failed', 0)
            return false
        }
    } catch (error) {
        console.error('Failed to download/extract fpcalc:', error)
        onProgress?.(`Failed: ${error}`, 0)
        return false
    }
}

/**
 * Ensure fpcalc is available, downloading if necessary
 */
export async function ensureFpcalc(
    onProgress?: (message: string, percentage?: number) => void
): Promise<boolean> {
    if (await isFpcalcInstalled()) {
        return true
    }

    console.log('fpcalc not found, downloading...')
    return downloadFpcalc(onProgress)
}

export interface FingerprintResult {
    fingerprint: string
    duration: number
}

/**
 * Generate fingerprint using fpcalc binary
 * This runs in a separate process, avoiding WASM memory issues
 */
export async function generateFingerprintWithFpcalc(
    filePath: string
): Promise<FingerprintResult | null> {
    const binaryPath = getFpcalcPath()

    if (!fs.existsSync(binaryPath)) {
        console.error('fpcalc binary not found. Please install it first.')
        return null
    }

    try {
        // Run fpcalc with JSON output
        const { stdout } = await execFileAsync(binaryPath, ['-json', filePath], {
            timeout: 60000, // 60 second timeout for long files
            maxBuffer: 10 * 1024 * 1024 // 10MB buffer for large fingerprints
        })

        const result = JSON.parse(stdout)

        if (result.fingerprint && result.duration) {
            return {
                fingerprint: result.fingerprint,
                duration: result.duration
            }
        }

        console.error('fpcalc returned incomplete result:', result)
        return null
    } catch (error: any) {
        if (error.killed) {
            console.error('fpcalc timed out for:', filePath)
        } else {
            console.error('fpcalc failed:', error.message)
        }
        return null
    }
}
