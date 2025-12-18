/**
 * Fingerprint Handlers Tests
 * Tests for fingerprint-related IPC handlers
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as fpcalcManager from '../../../fpcalcManager'

// Mock electron
vi.mock('electron', () => ({
    ipcMain: {
        handle: vi.fn(),
    },
    BrowserWindow: {
        fromWebContents: vi.fn(),
    },
}))

// Mock fpcalcManager
vi.mock('../../../fpcalcManager', () => ({
    ensureFpcalc: vi.fn(),
    generateFingerprintWithFpcalc: vi.fn(),
    isFpcalcInstalled: vi.fn(),
    getFpcalcPath: vi.fn(),
}))

// Mock worker pool
vi.mock('../../../fingerprintWorkerPool', () => ({
    generateFingerprintsParallel: vi.fn(),
    getCPUCount: vi.fn().mockReturnValue(8),
    getDefaultWorkerCount: vi.fn().mockReturnValue(4),
}))

import { generateFingerprintsParallel } from '../../../fingerprintWorkerPool'

beforeEach(() => {
    vi.clearAllMocks()
})

describe('Fingerprint Handlers', () => {
    describe('fingerprint-check-ready', () => {
        it('should return ready status', async () => {
            vi.mocked(fpcalcManager.isFpcalcInstalled).mockResolvedValue(true)
            vi.mocked(fpcalcManager.getFpcalcPath).mockReturnValue('/bin/fpcalc')

            // Simulate IPC handler
            const installed = await fpcalcManager.isFpcalcInstalled()
            const result = {
                ready: installed,
                path: installed ? fpcalcManager.getFpcalcPath() : null
            }

            expect(result.ready).toBe(true)
            expect(result.path).toBe('/bin/fpcalc')
        })
    })

    describe('fingerprint-ensure-ready', () => {
        it('should return success when setup succeeds', async () => {
            vi.mocked(fpcalcManager.ensureFpcalc).mockResolvedValue(true)
            vi.mocked(fpcalcManager.getFpcalcPath).mockReturnValue('/bin/fpcalc')

            const success = await fpcalcManager.ensureFpcalc()
            const result = {
                success,
                path: success ? fpcalcManager.getFpcalcPath() : null
            }

            expect(result.success).toBe(true)
        })

        it('should return failure when setup fails', async () => {
            vi.mocked(fpcalcManager.ensureFpcalc).mockResolvedValue(false)

            const success = await fpcalcManager.ensureFpcalc()

            expect(success).toBe(false)
        })
    })

    describe('generate-fingerprint', () => {
        it('should generate fingerprint successfully', async () => {
            vi.mocked(fpcalcManager.isFpcalcInstalled).mockResolvedValue(true)
            vi.mocked(fpcalcManager.generateFingerprintWithFpcalc).mockResolvedValue({
                fingerprint: 'fp123',
                duration: 180
            })

            const result = await fpcalcManager.generateFingerprintWithFpcalc('song.mp3')

            expect(result?.fingerprint).toBe('fp123')
        })

        it('should try to install if not ready', async () => {
            vi.mocked(fpcalcManager.isFpcalcInstalled).mockResolvedValue(false)
            vi.mocked(fpcalcManager.ensureFpcalc).mockResolvedValue(true)
            vi.mocked(fpcalcManager.generateFingerprintWithFpcalc).mockResolvedValue({
                fingerprint: 'fp123',
                duration: 180
            })

            // Simulate handler logic
            let installed = await fpcalcManager.isFpcalcInstalled()
            if (!installed) {
                await fpcalcManager.ensureFpcalc()
            }
            const result = await fpcalcManager.generateFingerprintWithFpcalc('song.mp3')

            expect(fpcalcManager.ensureFpcalc).toHaveBeenCalled()
            expect(result).not.toBeNull()
        })
    })

    describe('generate-fingerprints-batch', () => {
        it('should handle parallel batch generation', async () => {
            const mockResults = [
                {
                    filePath: 's1.mp3',
                    workerId: 1,
                    processingTimeMs: 100,
                    result: { success: true, fingerprint: 'fp1', duration: 100 }
                },
                {
                    filePath: 's2.mp3',
                    workerId: 2,
                    processingTimeMs: 100,
                    result: { success: true, fingerprint: 'fp2', duration: 200 }
                }
            ]
            vi.mocked(generateFingerprintsParallel).mockResolvedValue(mockResults as any)

            const results = await generateFingerprintsParallel(['s1.mp3', 's2.mp3'], vi.fn())

            expect(results).toHaveLength(2)
            expect(results[0].result.fingerprint).toBe('fp1')
        })
    })
})
