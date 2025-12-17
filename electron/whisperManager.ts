/**
 * Whisper.cpp Binary Manager
 * 
 * Manages the Whisper.cpp binary and model for audio transcription.
 * Supports multiple model sizes for trade-off between speed and accuracy.
 */

import fs from 'fs'
import path from 'path'
import https from 'https'
import { app } from 'electron'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { createWriteStream } from 'fs'
import AdmZip from 'adm-zip'

const execFileAsync = promisify(execFile)

// Whisper.cpp release version (from ggml-org/whisper.cpp)
const WHISPER_VERSION = '1.8.2'

// Download URLs for whisper.cpp binaries (repo moved from ggerganov to ggml-org)
const BINARY_URLS: Record<string, string> = {
    'win32-x64': `https://github.com/ggml-org/whisper.cpp/releases/download/v${WHISPER_VERSION}/whisper-bin-x64.zip`,
    'win32-ia32': `https://github.com/ggml-org/whisper.cpp/releases/download/v${WHISPER_VERSION}/whisper-bin-Win32.zip`,
    // Mac/Linux users should build from source for optimal performance
    'darwin-x64': '', // Build from source
    'darwin-arm64': '', // Build from source  
    'linux-x64': '', // Build from source
}

// Available whisper models with sizes and descriptions
export interface WhisperModel {
    id: string
    name: string
    filename: string
    size: string
    sizeBytes: number
    description: string
}

export const WHISPER_MODELS: WhisperModel[] = [
    {
        id: 'tiny.en',
        name: 'Tiny (English)',
        filename: 'ggml-tiny.en.bin',
        size: '75 MB',
        sizeBytes: 75 * 1024 * 1024,
        description: 'Fastest, lowest accuracy'
    },
    {
        id: 'base.en',
        name: 'Base (English)',
        filename: 'ggml-base.en.bin',
        size: '142 MB',
        sizeBytes: 142 * 1024 * 1024,
        description: 'Fast, good for clear audio'
    },
    {
        id: 'small.en',
        name: 'Small (English)',
        filename: 'ggml-small.en.bin',
        size: '466 MB',
        sizeBytes: 466 * 1024 * 1024,
        description: 'Balanced speed/accuracy'
    },
    {
        id: 'medium.en',
        name: 'Medium (English)',
        filename: 'ggml-medium.en.bin',
        size: '1.5 GB',
        sizeBytes: 1500 * 1024 * 1024,
        description: 'High accuracy, slower'
    },
    {
        id: 'large',
        name: 'Large (Multilingual)',
        filename: 'ggml-large-v3-turbo.bin',
        size: '1.6 GB',
        sizeBytes: 1600 * 1024 * 1024,
        description: 'Best accuracy, slowest'
    }
]

// Default model
const DEFAULT_MODEL_ID = 'small.en'

// Get model URL from HuggingFace
function getModelUrl(filename: string): string {
    return `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/${filename}`
}

// Get selected model from settings file
function getSelectedModelId(): string {
    try {
        const settingsPath = path.join(app.getPath('userData'), 'whisper-settings.json')
        if (fs.existsSync(settingsPath)) {
            const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
            return settings.modelId || DEFAULT_MODEL_ID
        }
    } catch (e) {
        // Ignore errors
    }
    return DEFAULT_MODEL_ID
}

// Save selected model to settings file
export function setSelectedModelId(modelId: string): void {
    const settingsPath = path.join(app.getPath('userData'), 'whisper-settings.json')
    fs.writeFileSync(settingsPath, JSON.stringify({ modelId }))
}

// Get the current model config
export function getSelectedModel(): WhisperModel {
    const modelId = getSelectedModelId()
    return WHISPER_MODELS.find(m => m.id === modelId) || WHISPER_MODELS[2] // Default to small.en
}

/**
 * Gets the whisper binary directory
 */
function getWhisperDir(): string {
    const userDataPath = app.getPath('userData')
    return path.join(userDataPath, 'whisper-binary')
}

/**
 * Gets the whisper binary path (whisper-cli executable)
 */
export function getWhisperPath(): string {
    const binaryDir = getWhisperDir()
    // main.exe is deprecated, use whisper-cli.exe
    const binaryName = process.platform === 'win32' ? 'whisper-cli.exe' : 'whisper-cli'
    return path.join(binaryDir, binaryName)
}

/**
 * Gets the whisper model path for the currently selected model
 */
export function getWhisperModelPath(): string {
    const binaryDir = getWhisperDir()
    const model = getSelectedModel()
    return path.join(binaryDir, model.filename)
}

/**
 * Check if whisper binary is installed and working
 */
export async function isWhisperInstalled(): Promise<boolean> {
    const binaryPath = getWhisperPath()
    const modelPath = getWhisperModelPath()

    if (!fs.existsSync(binaryPath) || !fs.existsSync(modelPath)) {
        return false
    }

    try {
        // whisper.cpp main shows help when run with --help
        await execFileAsync(binaryPath, ['--help'], { timeout: 5000 })
        return true
    } catch (error) {
        // --help may return non-zero exit code, but that's okay
        // Check if the binary at least runs
        return fs.existsSync(binaryPath) && fs.existsSync(modelPath)
    }
}

/**
 * Get whisper version (from help output)
 */
export async function getWhisperVersion(): Promise<string | null> {
    const binaryPath = getWhisperPath()

    if (!fs.existsSync(binaryPath)) {
        return null
    }

    try {
        const { stderr } = await execFileAsync(binaryPath, ['--help'], { timeout: 5000 })
        // Version is typically in the help output
        const match = stderr.match(/whisper\.cpp v?(\d+\.\d+\.\d+)/i)
        return match ? match[1] : WHISPER_VERSION // Return expected version if not found
    } catch (error) {
        return WHISPER_VERSION // Assume expected version
    }
}

/**
 * Download a file with redirect support
 */
async function downloadFile(url: string, destPath: string, onProgress?: (message: string, percentage?: number) => void): Promise<void> {
    return new Promise((resolve, reject) => {
        const file = createWriteStream(destPath)

        const request = (currentUrl: string) => {
            https.get(currentUrl, {
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

                const totalSize = parseInt(response.headers['content-length'] || '0', 10)
                let downloadedSize = 0

                response.on('data', (chunk) => {
                    downloadedSize += chunk.length
                    if (totalSize > 0 && onProgress) {
                        const percentage = Math.round((downloadedSize / totalSize) * 100)
                        onProgress(`Downloading... ${percentage}%`, percentage)
                    }
                })

                response.pipe(file)
                file.on('finish', () => {
                    file.close()
                    resolve()
                })
            }).on('error', (err) => {
                fs.unlink(destPath, () => { })
                reject(err)
            })
        }

        request(url)
    })
}

/**
 * Download and install whisper.cpp binary and model
 */
export async function downloadWhisper(
    onProgress?: (message: string, percentage?: number) => void
): Promise<boolean> {
    const platformKey = `${process.platform}-${process.arch}`
    const downloadUrl = BINARY_URLS[platformKey]

    // Check platform support
    if (process.platform !== 'win32') {
        console.error(`Whisper.cpp auto-download not supported on ${platformKey}. Please build from source.`)
        onProgress?.(`Please build whisper.cpp from source for ${process.platform}`, 0)
        return false
    }

    if (!downloadUrl) {
        console.error(`No whisper.cpp download available for platform: ${platformKey}`)
        onProgress?.(`No whisper.cpp available for ${platformKey}`, 0)
        return false
    }

    const binaryDir = getWhisperDir()
    const modelPath = getWhisperModelPath()

    // Create directory if it doesn't exist
    if (!fs.existsSync(binaryDir)) {
        fs.mkdirSync(binaryDir, { recursive: true })
    }

    try {
        // Step 1: Download binary
        onProgress?.('[Whisper] Downloading binary...', 10)
        console.log('[WhisperManager] Downloading binary from:', downloadUrl)

        const tempZipFile = path.join(binaryDir, 'whisper-download.zip')
        await downloadFile(downloadUrl, tempZipFile, (msg, pct) => {
            onProgress?.(`[Whisper] Binary: ${msg}`, 10 + (pct || 0) * 0.3)
        })

        // Step 2: Extract all files (we need DLLs too, not just the exe)
        onProgress?.('[Whisper] Extracting files...', 40)
        console.log('[WhisperManager] Extracting all files...')

        const zip = new AdmZip(tempZipFile)
        const entries = zip.getEntries()

        // Extract all files from the zip to the binary directory
        for (const entry of entries) {
            if (!entry.isDirectory) {
                const fileName = path.basename(entry.entryName)
                const destPath = path.join(binaryDir, fileName)
                fs.writeFileSync(destPath, entry.getData())
                console.log('[WhisperManager] Extracted:', fileName)
            }
        }

        // Clean up zip
        fs.unlinkSync(tempZipFile)

        // Make executables runnable on Unix
        if (process.platform !== 'win32') {
            const files = fs.readdirSync(binaryDir)
            for (const file of files) {
                const filePath = path.join(binaryDir, file)
                if (!file.includes('.') || file.endsWith('.bin')) continue // skip non-executables
                fs.chmodSync(filePath, 0o755)
            }
        }

        // Step 3: Download model (if not already present)
        const model = getSelectedModel()
        const modelUrl = getModelUrl(model.filename)

        if (!fs.existsSync(modelPath)) {
            onProgress?.(`[Whisper] Downloading ${model.name} model (${model.size})...`, 50)
            console.log('[WhisperManager] Downloading model from:', modelUrl)

            await downloadFile(modelUrl, modelPath, (msg, pct) => {
                onProgress?.(`[Whisper] Model: ${msg}`, 50 + (pct || 0) * 0.45)
            })
        } else {
            console.log('[WhisperManager] Model already exists, skipping download')
        }

        // Verify installation
        onProgress?.('[Whisper] Verifying installation...', 95)
        const installed = await isWhisperInstalled()

        if (installed) {
            onProgress?.('[Whisper] Installation complete!', 100)
            console.log('[WhisperManager] Installation successful')
            return true
        } else {
            onProgress?.('[Whisper] Installation failed', 0)
            console.error('[WhisperManager] Installation verification failed')
            return false
        }
    } catch (error) {
        console.error('[WhisperManager] Failed to download/extract whisper:', error)
        onProgress?.(`[Whisper] Failed: ${error}`, 0)
        return false
    }
}

/**
 * Ensure whisper is available, downloading if necessary
 */
export async function ensureWhisper(
    onProgress?: (message: string, percentage?: number) => void
): Promise<boolean> {
    if (await isWhisperInstalled()) {
        return true
    }

    console.log('[WhisperManager] Whisper not found, downloading...')
    return downloadWhisper(onProgress)
}

export interface TranscriptionResult {
    text: string
    segments?: Array<{
        start: number
        end: number
        text: string
    }>
}

/**
 * Transcribe audio using whisper.cpp
 * Input should be a WAV file (whisper.cpp prefers 16kHz mono WAV)
 */
export async function transcribeWithWhisper(
    audioPath: string,
    options?: {
        language?: string
        outputFormat?: 'txt' | 'srt' | 'vtt' | 'json'
    }
): Promise<TranscriptionResult | null> {
    const binaryPath = getWhisperPath()
    const modelPath = getWhisperModelPath()

    if (!fs.existsSync(binaryPath) || !fs.existsSync(modelPath)) {
        console.error('[WhisperManager] Binary or model not found. Please install first.')
        return null
    }

    try {
        const args = [
            '-m', modelPath,
            '-f', audioPath,
            '-l', options?.language || 'en',
            '--output-txt',
            '--no-timestamps'
        ]

        console.log('[WhisperManager] Running transcription:', binaryPath, args.join(' '))

        const { stdout, stderr } = await execFileAsync(binaryPath, args, {
            timeout: 300000, // 5 minute timeout for long files
            maxBuffer: 50 * 1024 * 1024 // 50MB buffer
        })

        // Parse output
        const text = stdout.trim() || stderr.trim()

        return {
            text,
            segments: []
        }
    } catch (error: any) {
        if (error.killed) {
            console.error('[WhisperManager] Transcription timed out for:', audioPath)
        } else {
            console.error('[WhisperManager] Transcription failed:', error.message)
        }
        return null
    }
}
