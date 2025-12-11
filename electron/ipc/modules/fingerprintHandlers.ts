/**
 * Fingerprint IPC Handlers
 * 
 * Handles fingerprint generation in the Main Process using fpcalc binary.
 * This avoids the WASM memory exhaustion issues that occur in the Renderer.
 */

import { ipcMain } from 'electron'
import {
    ensureFpcalc,
    generateFingerprintWithFpcalc,
    isFpcalcInstalled,
    getFpcalcPath
} from '../../fpcalcManager'

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
     * Generate fingerprint for an audio file
     * This is the main handler - runs fpcalc in a subprocess
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
}
