/**
 * Fingerprint Service Tests
 * Tests for the audio fingerprint generation service
 * 
 * Note: Some tests are simplified because the fingerprint module uses
 * module-level state for caching that persists across tests.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
    generateFingerprint,
    generateFingerprintsBatch,
    resetFingerprintErrors,
} from '../fingerprint'

// Mock electronAPI
const mockElectronAPI = {
    fingerprintEnsureReady: vi.fn().mockResolvedValue({ success: true }),
    generateFingerprint: vi.fn(),
    generateFingerprintsBatch: vi.fn(),
    onFingerprintBatchProgress: vi.fn(),
}

beforeEach(() => {
    vi.clearAllMocks()
    resetFingerprintErrors() // Reset circuit breaker
    Object.assign(window.electronAPI, mockElectronAPI)
    // Reset the mock to default success
    mockElectronAPI.fingerprintEnsureReady.mockResolvedValue({ success: true })
})

describe('fingerprint service', () => {
    describe('generateFingerprint', () => {
        it('should return fingerprint when generation succeeds', async () => {
            mockElectronAPI.generateFingerprint.mockResolvedValue({
                success: true,
                fingerprint: 'AQADtJKyZJSSJJBA',
                duration: 180,
            })

            const result = await generateFingerprint('/path/to/song.mp3')

            expect(result).toBe('AQADtJKyZJSSJJBA')
            expect(mockElectronAPI.generateFingerprint).toHaveBeenCalledWith('/path/to/song.mp3')
        })

        it('should return null when generation fails', async () => {
            mockElectronAPI.generateFingerprint.mockResolvedValue({
                success: false,
                error: 'Unsupported format',
            })

            const result = await generateFingerprint('/path/to/file.wav')

            expect(result).toBeNull()
        })

        it('should return null when IPC throws', async () => {
            mockElectronAPI.generateFingerprint.mockRejectedValue(new Error('Process crashed'))

            const result = await generateFingerprint('/path/to/song.mp3')

            expect(result).toBeNull()
        })

        it('should handle circuit breaker after too many errors', async () => {
            mockElectronAPI.generateFingerprint.mockResolvedValue({
                success: false,
                error: 'Error',
            })

            // Generate 5 consecutive errors to trigger circuit breaker
            for (let i = 0; i < 5; i++) {
                await generateFingerprint('/path/to/bad.mp3')
            }

            // Reset the mock to return success
            mockElectronAPI.generateFingerprint.mockResolvedValue({
                success: true,
                fingerprint: 'test-fp',
            })

            // This should be blocked by circuit breaker
            const result = await generateFingerprint('/path/to/good.mp3')

            expect(result).toBeNull()
        })

        it('should reset error count on success', async () => {
            mockElectronAPI.generateFingerprint
                .mockResolvedValueOnce({ success: false })
                .mockResolvedValueOnce({ success: false })
                .mockResolvedValueOnce({ success: true, fingerprint: 'fp' })

            await generateFingerprint('/fail1.mp3')
            await generateFingerprint('/fail2.mp3')
            const result = await generateFingerprint('/success.mp3')

            expect(result).toBe('fp')

            // Should be able to continue after success
            mockElectronAPI.generateFingerprint.mockResolvedValue({
                success: true,
                fingerprint: 'fp2',
            })
            const result2 = await generateFingerprint('/another.mp3')
            expect(result2).toBe('fp2')
        })
    })

    describe('generateFingerprintsBatch', () => {
        it('should return empty array for empty input', async () => {
            const result = await generateFingerprintsBatch([])

            expect(result).toEqual([])
            expect(mockElectronAPI.generateFingerprintsBatch).not.toHaveBeenCalled()
        })

        it('should return results when batch succeeds', async () => {
            const mockResults = [
                { filePath: '/song1.mp3', success: true, fingerprint: 'fp1', duration: 180, workerId: 1, processingTimeMs: 100 },
                { filePath: '/song2.mp3', success: true, fingerprint: 'fp2', duration: 240, workerId: 2, processingTimeMs: 150 },
            ]
            mockElectronAPI.generateFingerprintsBatch.mockResolvedValue({
                success: true,
                results: mockResults,
            })

            const result = await generateFingerprintsBatch(['/song1.mp3', '/song2.mp3'])

            expect(result).toEqual(mockResults)
        })

        it('should return failure results when batch fails', async () => {
            mockElectronAPI.generateFingerprintsBatch.mockResolvedValue({
                success: false,
                error: 'Worker pool crashed',
            })

            const result = await generateFingerprintsBatch(['/song1.mp3', '/song2.mp3'])

            expect(result).toHaveLength(2)
            expect(result[0].success).toBe(false)
            expect(result[0].fingerprint).toBeNull()
            expect(result[1].success).toBe(false)
        })

        it('should set up progress listener when callback provided', async () => {
            const cleanup = vi.fn()
            mockElectronAPI.onFingerprintBatchProgress.mockReturnValue(cleanup)
            mockElectronAPI.generateFingerprintsBatch.mockResolvedValue({
                success: true,
                results: [],
            })

            const onProgress = vi.fn()
            await generateFingerprintsBatch(['/song.mp3'], onProgress)

            expect(mockElectronAPI.onFingerprintBatchProgress).toHaveBeenCalledWith(onProgress)
            expect(cleanup).toHaveBeenCalled() // Cleanup should be called in finally
        })

        it('should cleanup progress listener even on error', async () => {
            const cleanup = vi.fn()
            mockElectronAPI.onFingerprintBatchProgress.mockReturnValue(cleanup)
            mockElectronAPI.generateFingerprintsBatch.mockRejectedValue(new Error('Crash'))

            const onProgress = vi.fn()

            await expect(generateFingerprintsBatch(['/song.mp3'], onProgress)).rejects.toThrow()

            expect(cleanup).toHaveBeenCalled()
        })
    })

    describe('resetFingerprintErrors', () => {
        it('should reset the error counter', async () => {
            mockElectronAPI.generateFingerprint.mockResolvedValue({ success: false })

            // Generate errors
            for (let i = 0; i < 5; i++) {
                await generateFingerprint('/fail.mp3')
            }

            // Reset
            resetFingerprintErrors()

            // Now should work again
            mockElectronAPI.generateFingerprint.mockResolvedValue({
                success: true,
                fingerprint: 'fp-recovered',
            })

            const result = await generateFingerprint('/recover.mp3')
            expect(result).toBe('fp-recovered')
        })
    })
})
