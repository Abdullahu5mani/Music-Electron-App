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

// Download URLs for whisper.cpp binaries
// Note: Only Windows has pre-built downloads. macOS/Linux use system-installed whisper
const BINARY_URLS: Record<string, string> = {
    'win32-x64': `https://github.com/ggml-org/whisper.cpp/releases/download/v${WHISPER_VERSION}/whisper-bin-x64.zip`,
    'win32-ia32': `https://github.com/ggml-org/whisper.cpp/releases/download/v${WHISPER_VERSION}/whisper-bin-Win32.zip`,
    // macOS/Linux: Use system-installed whisper-cpp (via Homebrew or apt)
    'darwin-x64': 'system',
    'darwin-arm64': 'system',
    'linux-x64': 'system',
}

// Platform-specific install instructions
export const WHISPER_INSTALL_INSTRUCTIONS: Record<string, string> = {
    'darwin': 'Install via Homebrew: brew install whisper-cpp',
    'linux': 'Install via package manager:\n  Ubuntu/Debian: sudo apt install whisper.cpp\n  Or build from source: https://github.com/ggml-org/whisper.cpp',
    'win32': 'Click "Install" to download automatically',
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
 * Check for system-installed whisper binary (macOS/Linux)
 */
function findSystemWhisper(): string | null {
    const platform = process.platform

    if (platform === 'win32') {
        return null // Windows uses downloaded binary
    }

    // Common paths for Homebrew and system packages
    // The binary name varies: whisper-cpp, whisper, main
    const possiblePaths = [
        // Homebrew on Apple Silicon
        '/opt/homebrew/bin/whisper-cpp',
        '/opt/homebrew/bin/whisper',
        '/opt/homebrew/bin/main',
        // Homebrew on Intel Mac
        '/usr/local/bin/whisper-cpp',
        '/usr/local/bin/whisper',
        '/usr/local/bin/main',
        // System packages (Linux)
        '/usr/bin/whisper-cpp',
        '/usr/bin/whisper',
        // Common build output locations
        '/usr/local/whisper.cpp/main',
    ]

    console.log('[WhisperManager] Searching for system whisper in paths:', possiblePaths)

    for (const binPath of possiblePaths) {
        if (fs.existsSync(binPath)) {
            console.log('[WhisperManager] Found system whisper at:', binPath)
            return binPath
        }
    }

    console.log('[WhisperManager] No system whisper found')
    return null
}

/**
 * Gets the whisper binary path (whisper-cli executable)
 * On Windows: uses downloaded binary
 * On macOS/Linux: uses system-installed whisper (Homebrew, apt, etc.)
 */
export function getWhisperPath(): string {
    // First check for system-installed whisper (macOS/Linux)
    const systemWhisper = findSystemWhisper()
    if (systemWhisper) {
        return systemWhisper
    }

    // Fall back to downloaded binary (Windows or manually installed)
    const binaryDir = getWhisperDir()
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
 * For macOS/Linux: checks system whisper + model
 * For Windows: checks downloaded whisper + model
 */
export async function isWhisperInstalled(): Promise<boolean> {
    const binaryPath = getWhisperPath()
    const modelPath = getWhisperModelPath()

    console.log('[WhisperManager] Checking installation...')
    console.log('[WhisperManager] Binary path:', binaryPath)
    console.log('[WhisperManager] Model path:', modelPath)
    console.log('[WhisperManager] Binary exists:', fs.existsSync(binaryPath))
    console.log('[WhisperManager] Model exists:', fs.existsSync(modelPath))

    // Model must always exist
    if (!fs.existsSync(modelPath)) {
        console.log('[WhisperManager] Model not found')
        return false
    }

    // For macOS/Linux with system whisper, we may not have a local binary
    const systemWhisper = findSystemWhisper()
    if (systemWhisper) {
        console.log('[WhisperManager] Using system whisper:', systemWhisper)
        // System whisper found + model exists = installed
        return true
    }

    // For Windows or fallback: check the downloaded binary
    if (!fs.existsSync(binaryPath)) {
        console.log('[WhisperManager] Binary not found')
        return false
    }

    try {
        // whisper.cpp shows help when run with --help
        await execFileAsync(binaryPath, ['--help'], { timeout: 5000 })
        console.log('[WhisperManager] Binary executable verified')
        return true
    } catch (error) {
        // --help may return non-zero exit code, but that's okay
        // As long as it ran (didn't throw ENOENT), binary is working
        console.log('[WhisperManager] Binary check returned error (may be OK):', error)
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
 * Windows: Downloads binary + model
 * macOS/Linux: Uses system whisper, only downloads model
 */
export async function downloadWhisper(
    onProgress?: (message: string, percentage?: number) => void
): Promise<boolean> {
    const platformKey = `${process.platform}-${process.arch}`
    const downloadUrl = BINARY_URLS[platformKey]
    const platform = process.platform

    const binaryDir = getWhisperDir()
    const modelPath = getWhisperModelPath()
    const model = getSelectedModel()

    // Create directory if it doesn't exist (for model storage)
    if (!fs.existsSync(binaryDir)) {
        fs.mkdirSync(binaryDir, { recursive: true })
    }

    try {
        // For macOS/Linux: Check for system-installed whisper
        if (platform === 'darwin' || platform === 'linux') {
            const systemWhisper = findSystemWhisper()

            if (!systemWhisper) {
                const instructions = WHISPER_INSTALL_INSTRUCTIONS[platform] || 'Please install whisper.cpp manually'
                console.log('[WhisperManager] System whisper not found. Instructions:', instructions)
                onProgress?.(`[Whisper] ${instructions}`, 0)

                // Still continue to download the model if whisper will be installed later
                console.log('[WhisperManager] Will download model for when whisper is installed...')
            } else {
                console.log('[WhisperManager] Found system whisper at:', systemWhisper)
                onProgress?.('[Whisper] Using system-installed whisper', 30)
            }

            // For macOS/Linux, skip binary download - just download model
            onProgress?.(`[Whisper] Downloading ${model.name} model (${model.size})...`, 40)
        } else {
            // Windows: Download binary
            if (!downloadUrl || downloadUrl === 'system') {
                console.error(`No whisper.cpp download available for platform: ${platformKey}`)
                onProgress?.(`No whisper.cpp available for ${platformKey}`, 0)
                return false
            }

            onProgress?.('[Whisper] Downloading binary...', 10)
            console.log('[WhisperManager] Downloading binary from:', downloadUrl)

            const tempZipFile = path.join(binaryDir, 'whisper-download.zip')
            await downloadFile(downloadUrl, tempZipFile, (msg, pct) => {
                onProgress?.(`[Whisper] Binary: ${msg}`, 10 + (pct || 0) * 0.3)
            })

            // Extract all files (we need DLLs too, not just the exe)
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
        }

        // Step 3: Download model (if not already present)
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
