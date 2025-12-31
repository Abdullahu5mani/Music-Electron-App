import { ipcMain, BrowserWindow } from 'electron'
import { downloadYouTubeAudio } from '../../youtubeDownloader'
import { getAllBinaryStatuses } from '../../binaryManager'
import { downloadFpcalc } from '../../fpcalcManager'
import { downloadWhisper, WHISPER_MODELS, getSelectedModel, setSelectedModelId } from '../../whisperManager'
import path from 'path'
import fs from 'fs'
import https from 'https'
import { app } from 'electron'

/**
 * Registers IPC handlers for YouTube download operations
 * - YouTube audio download with progress tracking  
 * - Binary status checking (yt-dlp, fpcalc)
 * - Binary installation
 */
export function registerYoutubeHandlers() {
    // Handle YouTube download
    ipcMain.handle('download-youtube', async (event, url: string, outputPath: string) => {
        const window = BrowserWindow.fromWebContents(event.sender)

        try {
            const result = await downloadYouTubeAudio({
                url,
                outputPath,
                onProgress: (progress) => {
                    // Send progress updates to renderer
                    window?.webContents.send('download-progress', progress)
                },
                onBinaryProgress: (progress) => {
                    // Send binary download progress updates to renderer
                    window?.webContents.send('binary-download-progress', progress)
                },
                onTitleReceived: (title) => {
                    // Send video title to renderer
                    window?.webContents.send('download-title', title)
                },
            })

            return result
        } catch (error) {
            console.error('YouTube download error:', error)
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }
        }
    })

    // Handle get binary statuses (yt-dlp and fpcalc status)
    ipcMain.handle('get-binary-statuses', async () => {
        try {
            return await getAllBinaryStatuses()
        } catch (error) {
            console.error('Error getting binary statuses:', error)
            return []
        }
    })

    // Handle yt-dlp installation
    ipcMain.handle('install-ytdlp', async (event) => {
        const window = BrowserWindow.fromWebContents(event.sender)

        try {
            const userDataPath = app.getPath('userData')
            const binaryDir = path.join(userDataPath, 'yt-dlp-binaries')

            // Ensure directory exists
            if (!fs.existsSync(binaryDir)) {
                fs.mkdirSync(binaryDir, { recursive: true })
            }

            // Determine binary filename
            let binaryName: string
            if (process.platform === 'win32') {
                binaryName = process.arch === 'arm64' ? 'yt-dlp_win_arm64.exe' : 'yt-dlp.exe'
            } else if (process.platform === 'darwin') {
                binaryName = process.arch === 'arm64' ? 'yt-dlp_macos_arm64' : 'yt-dlp_macos'
            } else {
                binaryName = process.arch === 'arm64' ? 'yt-dlp_linux_arm64' : 'yt-dlp_linux'
            }

            const binaryPath = path.join(binaryDir, binaryName)

            // Send progress updates
            window?.webContents.send('binary-install-progress', {
                binary: 'yt-dlp',
                status: 'downloading',
                message: 'Fetching latest release info...',
                percentage: 5
            })

            // Get latest release info from GitHub
            const release = await new Promise<any>((resolve, reject) => {
                https.get('https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest', {
                    headers: { 'User-Agent': 'music-sync-app' }
                }, (res) => {
                    let data = ''
                    res.on('data', (chunk) => { data += chunk })
                    res.on('end', () => {
                        try {
                            resolve(JSON.parse(data))
                        } catch (e) {
                            reject(e)
                        }
                    })
                }).on('error', reject)
            })

            // Find correct asset for platform
            const targetAssetName = binaryName
            const asset = release.assets.find((a: any) => a.name === targetAssetName)

            if (!asset) {
                throw new Error(`No binary found for ${process.platform} ${process.arch}`)
            }

            window?.webContents.send('binary-install-progress', {
                binary: 'yt-dlp',
                status: 'downloading',
                message: `Downloading ${asset.name}...`,
                percentage: 10
            })

            // Download binary
            await new Promise<void>((resolve, reject) => {
                const file = fs.createWriteStream(binaryPath)
                let downloadedBytes = 0
                const totalBytes = asset.size

                https.get(asset.browser_download_url, {
                    headers: { 'User-Agent': 'music-sync-app' }
                }, (res) => {
                    // Handle redirects
                    if (res.statusCode === 302 && res.headers.location) {
                        https.get(res.headers.location, {
                            headers: { 'User-Agent': 'music-sync-app' }
                        }, (redirectRes) => {
                            redirectRes.on('data', (chunk) => {
                                downloadedBytes += chunk.length
                                const percentage = 10 + (downloadedBytes / totalBytes) * 80
                                window?.webContents.send('binary-install-progress', {
                                    binary: 'yt-dlp',
                                    status: 'downloading',
                                    message: 'Downloading yt-dlp...',
                                    percentage: Math.min(percentage, 90)
                                })
                                file.write(chunk)
                            })
                            redirectRes.on('end', () => {
                                file.end()
                                resolve()
                            })
                        }).on('error', reject)
                        return
                    }

                    res.on('data', (chunk) => {
                        downloadedBytes += chunk.length
                        const percentage = 10 + (downloadedBytes / totalBytes) * 80
                        window?.webContents.send('binary-install-progress', {
                            binary: 'yt-dlp',
                            status: 'downloading',
                            message: 'Downloading yt-dlp...',
                            percentage: Math.min(percentage, 90)
                        })
                        file.write(chunk)
                    })
                    res.on('end', () => {
                        file.end()
                        resolve()
                    })
                }).on('error', reject)
            })

            // Make executable on Unix
            if (process.platform !== 'win32') {
                fs.chmodSync(binaryPath, 0o755)
            }

            window?.webContents.send('binary-install-progress', {
                binary: 'yt-dlp',
                status: 'installed',
                message: 'yt-dlp installed successfully!',
                percentage: 100
            })

            return { success: true }
        } catch (error) {
            console.error('Error installing yt-dlp:', error)
            window?.webContents.send('binary-install-progress', {
                binary: 'yt-dlp',
                status: 'error',
                message: `Installation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                percentage: 0
            })
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
        }
    })

    // Handle fpcalc installation
    ipcMain.handle('install-fpcalc', async (event) => {
        const window = BrowserWindow.fromWebContents(event.sender)

        try {
            const result = await downloadFpcalc((message, percentage) => {
                window?.webContents.send('binary-install-progress', {
                    binary: 'fpcalc',
                    status: 'downloading',
                    message,
                    percentage: percentage || 0
                })
            })

            if (result) {
                window?.webContents.send('binary-install-progress', {
                    binary: 'fpcalc',
                    status: 'installed',
                    message: 'fpcalc installed successfully!',
                    percentage: 100
                })
                return { success: true }
            } else {
                throw new Error('Installation failed')
            }
        } catch (error) {
            console.error('Error installing fpcalc:', error)
            window?.webContents.send('binary-install-progress', {
                binary: 'fpcalc',
                status: 'error',
                message: `Installation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                percentage: 0
            })
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
        }
    })

    // Handle whisper installation
    ipcMain.handle('install-whisper', async (event) => {
        const window = BrowserWindow.fromWebContents(event.sender)

        try {
            const result = await downloadWhisper((message, percentage) => {
                window?.webContents.send('binary-install-progress', {
                    binary: 'whisper',
                    status: 'downloading',
                    message,
                    percentage: percentage || 0
                })
            })

            if (result) {
                window?.webContents.send('binary-install-progress', {
                    binary: 'whisper',
                    status: 'installed',
                    message: 'whisper.cpp installed successfully!',
                    percentage: 100
                })
                return { success: true }
            } else {
                throw new Error('Installation failed')
            }
        } catch (error) {
            console.error('Error installing whisper:', error)
            window?.webContents.send('binary-install-progress', {
                binary: 'whisper',
                status: 'error',
                message: `Installation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                percentage: 0
            })
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
        }
    })

    // Get available whisper models
    ipcMain.handle('get-whisper-models', () => {
        return WHISPER_MODELS
    })

    // Get currently selected whisper model
    ipcMain.handle('get-selected-whisper-model', () => {
        return getSelectedModel()
    })

    // Set whisper model
    ipcMain.handle('set-whisper-model', (_, modelId: string) => {
        setSelectedModelId(modelId)
        return { success: true }
    })
}
