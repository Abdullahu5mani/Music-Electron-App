/**
 * useSongScanner Hook Tests
 * Tests for song scanning functionality with fingerprinting and API lookups
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSongScanner } from '../useSongScanner'
import type { MusicFile } from '../../../electron/musicScanner'

// Mock the services
vi.mock('../../services/fingerprint', () => ({
    generateFingerprint: vi.fn(),
    resetFingerprintErrors: vi.fn(),
}))

vi.mock('../../services/acoustid', () => ({
    lookupFingerprint: vi.fn(),
}))

vi.mock('../../services/musicbrainz', () => ({
    lookupRecording: vi.fn(),
    getCoverArtUrls: vi.fn(),
    pickBestRelease: vi.fn(),
}))

vi.mock('../../utils/rateLimiter', () => ({
    waitForAcoustID: vi.fn().mockResolvedValue(undefined),
    waitForMusicBrainz: vi.fn().mockResolvedValue(undefined),
    waitForCoverArt: vi.fn().mockResolvedValue(undefined),
    waitBetweenSongs: vi.fn().mockResolvedValue(undefined),
}))

// Import mocked modules for manipulation
import { generateFingerprint } from '../../services/fingerprint'
import { lookupFingerprint } from '../../services/acoustid'
import { lookupRecording, getCoverArtUrls, pickBestRelease } from '../../services/musicbrainz'

const mockGenerateFingerprint = generateFingerprint as ReturnType<typeof vi.fn>
const mockLookupFingerprint = lookupFingerprint as ReturnType<typeof vi.fn>
const mockLookupRecording = lookupRecording as ReturnType<typeof vi.fn>
const mockGetCoverArtUrls = getCoverArtUrls as ReturnType<typeof vi.fn>
const mockPickBestRelease = pickBestRelease as ReturnType<typeof vi.fn>

// Mock electronAPI
const mockScannerAPI = {
    cacheMarkFileScanned: vi.fn().mockResolvedValue(undefined),
    writeMetadata: vi.fn().mockResolvedValue({ success: true }),
    downloadImageWithFallback: vi.fn().mockResolvedValue({ success: true }),
    fingerprintGetPoolInfo: vi.fn().mockResolvedValue({ workerCount: 4, cpuCount: 8 }),
    generateFingerprintsBatch: vi.fn(),
    onFingerprintBatchProgress: vi.fn(() => () => { }),
}

const mockMusicFile: MusicFile = {
    path: '/music/test-song.mp3',
    name: 'test-song.mp3',
    extension: '.mp3',
    size: 5000000,
    metadata: {
        title: 'Original Title',
        artist: 'Original Artist',
        duration: 180,
    },
}

beforeEach(() => {
    vi.clearAllMocks()
    // Add mocks to window.electronAPI
    if (!window.electronAPI) {
        window.electronAPI = {} as any
    }
    Object.assign(window.electronAPI, mockScannerAPI)

    // Reset service mocks
    mockGenerateFingerprint.mockReset()
    mockLookupFingerprint.mockReset()
    mockLookupRecording.mockReset()
    mockGetCoverArtUrls.mockReturnValue([])
    mockPickBestRelease.mockReturnValue(null)
})

describe('useSongScanner', () => {
    describe('initialization', () => {
        it('should initialize with default state', () => {
            const { result } = renderHook(() => useSongScanner())

            expect(result.current.isScanning).toBe(false)
            expect(result.current.batchProgress.isScanning).toBe(false)
            expect(result.current.batchProgress.currentIndex).toBe(0)
            expect(result.current.batchProgress.totalCount).toBe(0)
        })

        it('should provide scan functions', () => {
            const { result } = renderHook(() => useSongScanner())

            expect(typeof result.current.scanSong).toBe('function')
            expect(typeof result.current.scanBatch).toBe('function')
            expect(typeof result.current.cancelBatchScan).toBe('function')
        })
    })

    describe('scanSong', () => {
        it('should return failure when fingerprint generation fails', async () => {
            mockGenerateFingerprint.mockResolvedValue(null)

            const onStatusUpdate = vi.fn()
            const { result } = renderHook(() =>
                useSongScanner({ onStatusUpdate })
            )

            let scanResult: any
            await act(async () => {
                scanResult = await result.current.scanSong(mockMusicFile)
            })

            expect(scanResult.success).toBe(false)
            expect(scanResult.status).toBe('scanned-no-match')
            expect(scanResult.error).toContain('fingerprint')
            expect(onStatusUpdate).toHaveBeenCalledWith(mockMusicFile.path, 'scanned-no-match')
        })

        it('should return failure when AcoustID lookup fails', async () => {
            mockGenerateFingerprint.mockResolvedValue('test-fingerprint-hash')
            mockLookupFingerprint.mockResolvedValue(null)

            const onShowNotification = vi.fn()
            const { result } = renderHook(() =>
                useSongScanner({ onShowNotification })
            )

            let scanResult: any
            await act(async () => {
                scanResult = await result.current.scanSong(mockMusicFile)
            })

            expect(scanResult.success).toBe(false)
            expect(scanResult.status).toBe('scanned-no-match')
            expect(onShowNotification).toHaveBeenCalledWith(
                expect.stringContaining('No match found'),
                'error'
            )
        })

        it('should return failure when MusicBrainz lookup fails', async () => {
            mockGenerateFingerprint.mockResolvedValue('test-fingerprint-hash')
            mockLookupFingerprint.mockResolvedValue({ mbid: 'test-mbid', score: 0.95 })
            mockLookupRecording.mockResolvedValue(null)

            const onShowNotification = vi.fn()
            const { result } = renderHook(() =>
                useSongScanner({ onShowNotification })
            )

            let scanResult: any
            await act(async () => {
                scanResult = await result.current.scanSong(mockMusicFile)
            })

            expect(scanResult.success).toBe(false)
            expect(onShowNotification).toHaveBeenCalledWith(
                expect.stringContaining('No metadata found'),
                'error'
            )
        })

        it('should succeed and return metadata when all lookups succeed', async () => {
            mockGenerateFingerprint.mockResolvedValue('test-fingerprint-hash')
            mockLookupFingerprint.mockResolvedValue({ mbid: 'test-mbid', score: 0.95 })
            mockLookupRecording.mockResolvedValue({
                title: 'Found Title',
                'artist-credit': [{ name: 'Found Artist' }],
                releases: [{ id: 'release-1', title: 'Album Name', date: '2023' }],
            })
            mockPickBestRelease.mockReturnValue({ title: 'Album Name', date: '2023' })
            mockGetCoverArtUrls.mockReturnValue(['https://example.com/cover.jpg'])

            const onShowNotification = vi.fn()
            const onStatusUpdate = vi.fn()
            const { result } = renderHook(() =>
                useSongScanner({ onShowNotification, onStatusUpdate })
            )

            let scanResult: any
            await act(async () => {
                scanResult = await result.current.scanSong(mockMusicFile)
            })

            expect(scanResult.success).toBe(true)
            expect(scanResult.status).toBe('scanned-tagged')
            expect(scanResult.title).toBe('Found Title')
            expect(scanResult.artist).toBe('Found Artist')
            expect(onStatusUpdate).toHaveBeenCalledWith(mockMusicFile.path, 'scanned-tagged')
            expect(onShowNotification).toHaveBeenCalledWith(
                expect.stringContaining('Tagged'),
                'success'
            )
        })

        it('should handle write metadata failure', async () => {
            mockGenerateFingerprint.mockResolvedValue('test-fingerprint-hash')
            mockLookupFingerprint.mockResolvedValue({ mbid: 'test-mbid', score: 0.95 })
            mockLookupRecording.mockResolvedValue({
                title: 'Found Title',
                'artist-credit': [{ name: 'Found Artist' }],
                releases: [],
            })
            mockScannerAPI.writeMetadata.mockResolvedValue({ success: false, error: 'Write failed' })

            const onShowNotification = vi.fn()
            const { result } = renderHook(() =>
                useSongScanner({ onShowNotification })
            )

            let scanResult: any
            await act(async () => {
                scanResult = await result.current.scanSong(mockMusicFile)
            })

            expect(scanResult.success).toBe(false)
            expect(scanResult.status).toBe('scanned-no-match')
            expect(onShowNotification).toHaveBeenCalledWith(
                expect.stringContaining('Failed to write metadata'),
                'error'
            )
        })
    })

    describe('scanBatch', () => {
        it('should handle empty file list', async () => {
            const onShowNotification = vi.fn()
            const { result } = renderHook(() =>
                useSongScanner({ onShowNotification })
            )

            await act(async () => {
                await result.current.scanBatch([])
            })

            expect(onShowNotification).toHaveBeenCalledWith('No songs to scan', 'info')
        })

        it('should set scanning state during batch', async () => {
            mockScannerAPI.generateFingerprintsBatch.mockResolvedValue({
                success: true,
                results: [{ filePath: mockMusicFile.path, success: true, fingerprint: 'fp1', duration: 180 }],
                stats: { successCount: 1, failureCount: 0, totalFiles: 1, totalTimeMs: 1000 },
            })
            mockLookupFingerprint.mockResolvedValue(null)

            const { result } = renderHook(() => useSongScanner())

            // Check initial state
            expect(result.current.isScanning).toBe(false)

            await act(async () => {
                await result.current.scanBatch([mockMusicFile])
            })

            // After completion, should be false again
            expect(result.current.isScanning).toBe(false)
        })

        it('should call update progress callback', async () => {
            mockScannerAPI.generateFingerprintsBatch.mockResolvedValue({
                success: true,
                results: [{ filePath: mockMusicFile.path, success: true, fingerprint: 'fp1', duration: 180 }],
                stats: { successCount: 1, failureCount: 0, totalFiles: 1, totalTimeMs: 1000 },
            })
            mockLookupFingerprint.mockResolvedValue({ mbid: 'test-mbid', score: 0.95 })
            mockLookupRecording.mockResolvedValue({
                title: 'Song',
                'artist-credit': [{ name: 'Artist' }],
                releases: [],
            })
            mockScannerAPI.writeMetadata.mockResolvedValue({ success: true })

            const onUpdateSingleFile = vi.fn().mockResolvedValue(null)
            const { result } = renderHook(() =>
                useSongScanner({ onUpdateSingleFile })
            )

            await act(async () => {
                await result.current.scanBatch([mockMusicFile])
            })

            // Verify writeMetadata was called
            expect(mockScannerAPI.writeMetadata).toHaveBeenCalled()

            expect(onUpdateSingleFile).toHaveBeenCalledWith(mockMusicFile.path)
        })
    })

    describe('cancelBatchScan', () => {
        it('should have cancel function', () => {
            const { result } = renderHook(() => useSongScanner())

            expect(typeof result.current.cancelBatchScan).toBe('function')
        })
    })

    describe('error handling', () => {
        it('should handle exceptions gracefully', async () => {
            mockGenerateFingerprint.mockRejectedValue(new Error('Network error'))

            const onStatusUpdate = vi.fn()
            const { result } = renderHook(() =>
                useSongScanner({ onStatusUpdate })
            )

            let scanResult: any
            await act(async () => {
                scanResult = await result.current.scanSong(mockMusicFile)
            })

            expect(scanResult.success).toBe(false)
            expect(scanResult.status).toBe('scanned-no-match')
            expect(scanResult.error).toContain('Network error')
        })
    })
})
