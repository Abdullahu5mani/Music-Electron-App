import { ipcMain, BrowserWindow } from 'electron'
import path from 'path'
import fs from 'fs'
import os from 'os'
import { spawn } from 'child_process'
import { isWhisperInstalled, getWhisperPath, getWhisperModelPath } from '../../whisperManager'
import { getCachedLyrics, cacheLyrics } from '../../lyricsCache'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

/**
 * Parse Whisper timestamp format (HH:MM:SS,mmm or HH:MM:SS.mmm) to seconds
 */
function parseTimestamp(timestamp: string): number {
    // Handle formats like "00:00:00,000" or "00:00:00.000"
    const match = timestamp.match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/)
    if (!match) return 0

    const hours = parseInt(match[1], 10)
    const minutes = parseInt(match[2], 10)
    const seconds = parseInt(match[3], 10)
    const milliseconds = parseInt(match[4], 10)

    return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000
}

// Temp directory for lyrics processing
const TEMP_DIR_NAME = 'music-app-lyrics'

/**
 * Safely delete a file if it exists
 */
function safeDeleteFile(filePath: string): void {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath)
            console.log('[LyricsHandler] Cleaned up temp file:', path.basename(filePath))
        }
    } catch (err) {
        console.warn('[LyricsHandler] Failed to delete temp file:', filePath, err)
    }
}

/**
 * Clean up old temp files in the lyrics temp directory
 * Removes files older than 1 hour to prevent accumulation
 */
export function cleanupTempDir(): void {
    const tempDir = path.join(os.tmpdir(), TEMP_DIR_NAME)

    if (!fs.existsSync(tempDir)) {
        return
    }

    try {
        const files = fs.readdirSync(tempDir)
        const now = Date.now()
        const ONE_HOUR = 60 * 60 * 1000
        let cleanedCount = 0

        for (const file of files) {
            const filePath = path.join(tempDir, file)
            try {
                const stats = fs.statSync(filePath)
                // Delete files older than 1 hour
                if (now - stats.mtimeMs > ONE_HOUR) {
                    fs.unlinkSync(filePath)
                    cleanedCount++
                }
            } catch (err) {
                // Ignore errors for individual files
            }
        }

        if (cleanedCount > 0) {
            console.log(`[LyricsHandler] Cleaned up ${cleanedCount} old temp files`)
        }
    } catch (err) {
        console.warn('[LyricsHandler] Error cleaning temp directory:', err)
    }
}

export function registerLyricsHandlers() {
    // Clean up old temp files on startup
    cleanupTempDir()
    ipcMain.handle('process-lyrics', async (event, filePath: string) => {
        const window = BrowserWindow.fromWebContents(event.sender)

        // Helper to send progress updates
        const sendProgress = (step: string, percentage: number) => {
            window?.webContents.send('lyrics-progress', { step, percentage })
        }

        // Prepare temp file path (declared outside try for cleanup in catch)
        const fileName = path.basename(filePath)
        const tempDir = path.join(os.tmpdir(), TEMP_DIR_NAME)
        const wavPath = path.join(tempDir, `vocals_${path.basename(fileName, path.extname(fileName))}.wav`)

        try {
            console.log('[LyricsHandler] Processing:', fileName)
            sendProgress('Checking cache...', 0)

            // Check cache first
            const cached = getCachedLyrics(filePath)
            if (cached) {
                console.log('[LyricsHandler] Using cached lyrics for:', fileName)
                sendProgress('Complete!', 100)
                return {
                    success: true,
                    message: `Lyrics loaded from cache for: ${fileName}`,
                    lyrics: cached.lyrics,
                    segments: cached.segments
                }
            }

            sendProgress('Starting...', 5)

            // Check if whisper is installed
            const whisperReady = await isWhisperInstalled()
            if (!whisperReady) {
                console.error('[LyricsHandler] Whisper not installed. Please install from Settings.')
                sendProgress('Error: Whisper not installed', 0)
                return { success: false, message: 'Whisper not installed. Please install from Settings.' }
            }

            // Create temp folder
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true })
            }

            // ============================================================
            // ADVANCED MULTI-STAGE VOCAL ISOLATION PIPELINE
            // ============================================================
            // This pipeline uses 8 stages to maximize vocal clarity:
            // 1. Center channel extraction (vocals are usually centered)
            // 2. Frequency band isolation (human voice range)
            // 3. First-pass noise reduction (gentle FFT denoise)
            // 4. Second-pass noise reduction (aggressive FFT denoise)
            // 5. Vocal presence EQ (boost voice frequencies)
            // 6. De-essing (reduce harsh sibilants for cleaner transcription)
            // 7. Compression (even out dynamics)
            // 8. Loudness normalization (consistent level for Whisper)
            // ============================================================

            const filterChain = [
                // STAGE 1: Center Channel Extraction
                // Vocals are typically panned to center. Extract by averaging L+R
                // This emphasizes the common (center) signal where vocals live
                'pan=1c|c0=0.5*c0+0.5*c1',

                // STAGE 2: Frequency Band Isolation
                // Human singing voice: fundamental 85-1100Hz, harmonics up to 12kHz
                // Cutting below 85Hz removes bass instruments and rumble
                // Cutting above 12kHz removes cymbals and high-frequency noise
                'highpass=f=85:poles=2',
                'lowpass=f=12000:poles=2',

                // STAGE 3: First-Pass Noise Reduction (Gentle)
                // Light pass to reduce obvious background noise without artifacts
                'afftdn=nf=-20',

                // STAGE 4: Second-Pass Noise Reduction (Targeted)
                // Use nr (noise reduction amount in dB) for stronger reduction
                'afftdn=nr=12:nf=-25',

                // STAGE 5: Vocal Presence EQ
                // Boost key frequencies where voice clarity lives
                // Cut muddiness at 250Hz, boost presence at 1-5kHz
                'equalizer=f=250:width_type=o:width=2:g=-3',
                'equalizer=f=1000:width_type=o:width=1:g=2',
                'equalizer=f=3000:width_type=o:width=1.5:g=4',
                'equalizer=f=5000:width_type=o:width=1:g=2',

                // STAGE 6: De-essing
                // Reduce harsh "s" and "sh" sounds that can confuse transcription
                'highshelf=f=7000:g=-3',

                // STAGE 7: Compression
                // Even out loud and quiet parts for consistent transcription
                'acompressor=threshold=0.1:ratio=4:attack=5:release=100:makeup=2',

                // STAGE 8: Loudness Normalization
                // Ensure consistent level for Whisper (targets -16 LUFS broadcast standard)
                'loudnorm=I=-16:LRA=11:TP=-1.5'
            ].join(',')

            // Step 1: FFmpeg vocal isolation
            console.log('[LyricsHandler] Step 1: Isolating vocals with FFmpeg...')
            sendProgress('Isolating vocals...', 20)

            const ffmpegArgs = [
                '-y',
                '-i', filePath,
                '-af', filterChain,
                '-ar', '16000',
                '-ac', '1',
                wavPath
            ]

            await new Promise<void>((resolve, reject) => {
                const process = spawn('ffmpeg', ffmpegArgs)

                process.stderr.on('data', () => {
                    // FFmpeg logs to stderr
                })

                process.on('close', (code) => {
                    if (code === 0) {
                        resolve()
                    } else {
                        reject(new Error(`FFmpeg exited with code ${code}`))
                    }
                })

                process.on('error', (err) => {
                    reject(err)
                })
            })

            console.log('[LyricsHandler] Step 1 complete: Vocals isolated')
            sendProgress('Transcribing with AI...', 50)

            // Step 2: Whisper transcription
            console.log('[LyricsHandler] Step 2: Transcribing with Whisper...')
            const whisperPath = getWhisperPath()
            const modelPath = getWhisperModelPath()

            // Output JSON file path (whisper adds .json extension)
            const jsonOutputPath = wavPath + '.json'

            const whisperArgs = [
                '-m', modelPath,
                '-f', wavPath,
                '-l', 'en',
                '-oj',  // Output JSON with timestamps
                '--prompt', 'This is a song. Transcribe the sung lyrics word for word.'
            ]

            await execFileAsync(whisperPath, whisperArgs, {
                timeout: 300000,
                maxBuffer: 50 * 1024 * 1024
            })

            // Parse the JSON output file
            let lyrics = ''
            let segments: Array<{ start: number; end: number; text: string }> = []

            if (fs.existsSync(jsonOutputPath)) {
                try {
                    const jsonContent = fs.readFileSync(jsonOutputPath, 'utf-8')
                    const whisperOutput = JSON.parse(jsonContent)

                    // Whisper JSON format: { transcription: [{ timestamps: { from, to }, text }] }
                    if (whisperOutput.transcription && Array.isArray(whisperOutput.transcription)) {
                        segments = whisperOutput.transcription.map((seg: any) => ({
                            start: parseTimestamp(seg.timestamps?.from || '00:00:00,000'),
                            end: parseTimestamp(seg.timestamps?.to || '00:00:00,000'),
                            text: (seg.text || '').trim()
                        })).filter((seg: any) => seg.text.length > 0)

                        // Build full lyrics text from segments
                        lyrics = segments.map(s => s.text).join('\n')
                    }

                    console.log('[LyricsHandler] Parsed', segments.length, 'timed segments')
                } catch (parseError) {
                    console.error('[LyricsHandler] Failed to parse JSON output:', parseError)
                }

                // Clean up JSON output file
                safeDeleteFile(jsonOutputPath)
            }

            // Clean up temp WAV file
            safeDeleteFile(wavPath)

            console.log('[LyricsHandler] Step 2 complete: Transcription finished')
            console.log('[LyricsHandler] Lyrics length:', lyrics.length, 'characters')
            console.log('[LyricsHandler] Segments count:', segments.length)

            sendProgress('Complete!', 100)

            // Cache the results for future use
            if (lyrics.length > 0) {
                cacheLyrics(filePath, lyrics, segments)
            }

            return {
                success: true,
                message: `Lyrics generated for: ${fileName}`,
                lyrics,
                segments
            }

        } catch (error) {
            console.error('[LyricsHandler] Error:', error)
            // Clean up temp file on error as well
            safeDeleteFile(wavPath)
            sendProgress('Error occurred', 0)
            return { success: false, message: error instanceof Error ? error.message : 'Unknown error' }
        }
    })
}
