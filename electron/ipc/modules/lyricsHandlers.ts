import { ipcMain, BrowserWindow } from 'electron'
import path from 'path'
import fs from 'fs'
import os from 'os'
import { spawn } from 'child_process'
import { isWhisperInstalled, getWhisperPath, getWhisperModelPath } from '../../whisperManager'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

export function registerLyricsHandlers() {
    ipcMain.handle('process-lyrics', async (event, filePath: string) => {
        const window = BrowserWindow.fromWebContents(event.sender)

        // Helper to send progress updates
        const sendProgress = (step: string, percentage: number) => {
            window?.webContents.send('lyrics-progress', { step, percentage })
        }

        try {
            const fileName = path.basename(filePath)
            console.log('[LyricsHandler] Processing:', fileName)
            sendProgress('Starting...', 0)

            // Check if whisper is installed
            const whisperReady = await isWhisperInstalled()
            if (!whisperReady) {
                console.error('[LyricsHandler] Whisper not installed. Please install from Settings.')
                sendProgress('Error: Whisper not installed', 0)
                return { success: false, message: 'Whisper not installed. Please install from Settings.' }
            }

            // Create temp folder
            const tempDir = path.join(os.tmpdir(), 'music-app-lyrics')
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true })
            }

            // Whisper needs 16kHz mono WAV
            const wavPath = path.join(tempDir, `vocals_${path.basename(fileName, path.extname(fileName))}.wav`)

            // Multi-stage DSP processing for vocal isolation
            const filterChain = [
                'pan=1c|c0=0.5*c0+0.5*c1',
                'highpass=f=100',
                'lowpass=f=8000',
                'afftdn=nf=-20:nt=w',
                'acompressor=threshold=-20dB:ratio=4:attack=5:release=50',
                'dynaudnorm=p=0.9:s=5'
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

            const whisperArgs = [
                '-m', modelPath,
                '-f', wavPath,
                '-l', 'en',
                '--no-timestamps',
                '--prompt', 'This is a song. Transcribe the sung lyrics word for word.'
            ]

            const { stdout, stderr } = await execFileAsync(whisperPath, whisperArgs, {
                timeout: 300000,
                maxBuffer: 50 * 1024 * 1024
            })

            // Get the transcription text
            const lyrics = (stdout || stderr).trim()

            // Clean up temp WAV file
            if (fs.existsSync(wavPath)) {
                fs.unlinkSync(wavPath)
            }

            console.log('[LyricsHandler] Step 2 complete: Transcription finished')
            console.log('[LyricsHandler] ========== LYRICS ==========')
            console.log(lyrics)
            console.log('[LyricsHandler] ============================')

            sendProgress('Complete!', 100)

            return { success: true, message: `Lyrics generated for: ${fileName}`, lyrics }

        } catch (error) {
            console.error('[LyricsHandler] Error:', error)
            sendProgress('Error occurred', 0)
            return { success: false, message: error instanceof Error ? error.message : 'Unknown error' }
        }
    })
}
