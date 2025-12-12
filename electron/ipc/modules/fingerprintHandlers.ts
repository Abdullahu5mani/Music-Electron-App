/**
 * Fingerprint IPC Handlers
 * 
 * Handles fingerprint generation in the Main Process using fpcalc binary.
 * This avoids the WASM memory exhaustion issues that occur in the Renderer.
 * 
 * Supports both single-file and parallel batch fingerprinting.
 */

import { ipcMain, BrowserWindow } from 'electron'
import {
    ensureFpcalc,
    generateFingerprintWithFpcalc,
    isFpcalcInstalled,
    getFpcalcPath
} from '../../fpcalcManager'
import {
    generateFingerprintsParallel,
    getCPUCount,
    getDefaultWorkerCount
} from '../../fingerprintWorkerPool'

export function registerFingerprintHandlers() {
    /**
     * Check if fpcalc is installed and ready
     */
    ipcMain.handle('fingerprint-check-ready', async () => {
        const installed = await isFpcalcInstalled()
        return {
            ready: installed,
            path: installed ? getFpcalcPath() : null
        }
    })

    /**
     * Ensure fpcalc is installed, downloading if necessary
     */
    ipcMain.handle('fingerprint-ensure-ready', async () => {
        try {
            const success = await ensureFpcalc((message: string, percentage?: number) => {
                console.log(`fpcalc setup: ${message} (${percentage}%)`)
            })
            return {
                success,
                path: success ? getFpcalcPath() : null
            }
        } catch (error) {
            console.error('Failed to ensure fpcalc:', error)
            return {
                success: false,
                error: String(error)
            }
        }
    })

    /**
     * Generate fingerprint for a single audio file
     */
    ipcMain.handle('generate-fingerprint', async (_event, filePath: string) => {
        try {
            // Ensure fpcalc is available
            const installed = await isFpcalcInstalled()
            if (!installed) {
                console.log('fpcalc not installed, attempting to download...')
                const success = await ensureFpcalc()
                if (!success) {
                    return {
                        success: false,
                        error: 'fpcalc binary not available and could not be downloaded'
                    }
                }
            }

            // Generate fingerprint
            const result = await generateFingerprintWithFpcalc(filePath)

            if (result) {
                return {
                    success: true,
                    fingerprint: result.fingerprint,
                    duration: result.duration
                }
            } else {
                return {
                    success: false,
                    error: 'Failed to generate fingerprint'
                }
            }
        } catch (error) {
            console.error('Fingerprint generation error:', error)
            return {
                success: false,
                error: String(error)
            }
        }
    })

    /**
     * Generate fingerprints for multiple files in PARALLEL
     * Uses worker pool with (CPU cores - 1) concurrent processes
     * Sends progress events back to renderer
     */
    ipcMain.handle('generate-fingerprints-batch', async (event, filePaths: string[]) => {
        const startTime = Date.now()
        const cpuCount = getCPUCount()
        const workerCount = getDefaultWorkerCount()

        console.log(`[BatchFingerprint] Starting batch of ${filePaths.length} files`)
        console.log(`[BatchFingerprint] CPU cores: ${cpuCount}, Workers: ${workerCount}`)

        // Get the sender window to emit progress events
        const webContents = event.sender
        const window = BrowserWindow.fromWebContents(webContents)

        try {
            const results = await generateFingerprintsParallel(
                filePaths,
                (completed, total, workerId, fileName) => {
                    // Send progress event to renderer
                    if (window && !window.isDestroyed()) {
                        window.webContents.send('fingerprint-batch-progress', {
                            completed,
                            total,
                            workerId,
                            fileName,
                            percentage: Math.round((completed / total) * 100)
                        })
                    }
                }
            )

            const totalTime = Date.now() - startTime
            const successCount = results.filter(r => r.result.success).length
            const failCount = results.length - successCount

            console.log(`[BatchFingerprint] Complete: ${successCount} success, ${failCount} failed in ${totalTime}ms`)

            return {
                success: true,
                results: results.map(r => ({
                    filePath: r.filePath,
                    success: r.result.success,
                    fingerprint: r.result.fingerprint,
                    duration: r.result.duration,
                    workerId: r.workerId,
                    processingTimeMs: r.processingTimeMs
                })),
                stats: {
                    totalFiles: filePaths.length,
                    successCount,
                    failCount,
                    totalTimeMs: totalTime,
                    avgTimeMs: Math.round(totalTime / filePaths.length),
                    cpuCount,
                    workerCount
                }
            }
        } catch (error) {
            console.error('[BatchFingerprint] Error:', error)
            return {
                success: false,
                error: String(error)
            }
        }
    })

    /**
     * Get info about the fingerprint worker pool
     */
    ipcMain.handle('fingerprint-get-pool-info', async () => {
        return {
            cpuCount: getCPUCount(),
            workerCount: getDefaultWorkerCount()
        }
    })
}

