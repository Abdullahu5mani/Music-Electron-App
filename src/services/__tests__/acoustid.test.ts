/**
 * AcoustID Service Tests
 * Tests for the AcoustID API client
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { lookupFingerprint } from '../acoustid'

// Mock electronAPI
const mockElectronAPI = {
    lookupAcoustid: vi.fn(),
}

beforeEach(() => {
    vi.clearAllMocks()
    Object.assign(window.electronAPI, mockElectronAPI)
})

describe('acoustid service', () => {
    describe('lookupFingerprint', () => {
        it('should return result when API call succeeds', async () => {
            const mockResult = {
                mbid: 'test-mbid-123',
                title: 'Test Song',
                artist: 'Test Artist',
            }
            mockElectronAPI.lookupAcoustid.mockResolvedValue(mockResult)

            const result = await lookupFingerprint('test-fingerprint', 180)

            expect(result).toEqual(mockResult)
            expect(mockElectronAPI.lookupAcoustid).toHaveBeenCalledWith('test-fingerprint', 180)
        })

        it('should return null when API returns null', async () => {
            mockElectronAPI.lookupAcoustid.mockResolvedValue(null)

            const result = await lookupFingerprint('test-fingerprint', 180)

            expect(result).toBeNull()
        })

        it('should return null when API throws error', async () => {
            mockElectronAPI.lookupAcoustid.mockRejectedValue(new Error('Network error'))

            const result = await lookupFingerprint('test-fingerprint', 180)

            expect(result).toBeNull()
        })

        it('should pass correct parameters to IPC', async () => {
            mockElectronAPI.lookupAcoustid.mockResolvedValue({ mbid: 'test-mbid' })

            await lookupFingerprint('fingerprint-abc-123', 240)

            expect(mockElectronAPI.lookupAcoustid).toHaveBeenCalledTimes(1)
            expect(mockElectronAPI.lookupAcoustid).toHaveBeenCalledWith('fingerprint-abc-123', 240)
        })

        it('should handle zero duration', async () => {
            mockElectronAPI.lookupAcoustid.mockResolvedValue({ mbid: 'test-mbid' })

            const result = await lookupFingerprint('test-fingerprint', 0)

            expect(result).toEqual({ mbid: 'test-mbid' })
            expect(mockElectronAPI.lookupAcoustid).toHaveBeenCalledWith('test-fingerprint', 0)
        })
    })

    describe('AcoustIDResultData interface', () => {
        it('should accept result with all fields', async () => {
            const fullResult = {
                mbid: 'mbid-123',
                title: 'Song Title',
                artist: 'Artist Name',
            }
            mockElectronAPI.lookupAcoustid.mockResolvedValue(fullResult)

            const result = await lookupFingerprint('fp', 100)

            expect(result?.mbid).toBe('mbid-123')
            expect(result?.title).toBe('Song Title')
            expect(result?.artist).toBe('Artist Name')
        })

        it('should accept result with only mbid', async () => {
            const minimalResult = { mbid: 'mbid-only' }
            mockElectronAPI.lookupAcoustid.mockResolvedValue(minimalResult)

            const result = await lookupFingerprint('fp', 100)

            expect(result?.mbid).toBe('mbid-only')
            expect(result?.title).toBeUndefined()
            expect(result?.artist).toBeUndefined()
        })
    })
})
