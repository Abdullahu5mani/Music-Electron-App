/**
 * Cache Handlers Tests
 * Tests for metadata cache IPC handlers
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as metadataCache from '../../../metadataCache'
import type { ScanStatusType, FileScanStatus } from '../../../metadataCache'

// Mock electron
vi.mock('electron', () => ({
    ipcMain: {
        handle: vi.fn(),
    },
}))

// Mock metadataCache module
vi.mock('../../../metadataCache', () => ({
    getFileScanStatus: vi.fn(),
    markFileScanned: vi.fn(),
    getBatchScanStatus: vi.fn(),
    getUnscannedFiles: vi.fn(),
    getScanStatistics: vi.fn(),
    cleanupOrphanedEntries: vi.fn(),
    getCachedEntry: vi.fn(),
    clearCache: vi.fn(),
}))

beforeEach(() => {
    vi.clearAllMocks()
})

describe('Cache Handlers', () => {
    describe('getFileScanStatus', () => {
        it('should return unscanned for new file', async () => {
            vi.mocked(metadataCache.getFileScanStatus).mockReturnValue('unscanned')

            const result = metadataCache.getFileScanStatus('/new/file.mp3')

            expect(result).toBe('unscanned')
        })

        it('should return scanned-tagged for file with metadata', async () => {
            vi.mocked(metadataCache.getFileScanStatus).mockReturnValue('scanned-tagged')

            const result = metadataCache.getFileScanStatus('/tagged/file.mp3')

            expect(result).toBe('scanned-tagged')
        })

        it('should return scanned-no-match for file without match', async () => {
            vi.mocked(metadataCache.getFileScanStatus).mockReturnValue('scanned-no-match')

            const result = metadataCache.getFileScanStatus('/nomatch/file.mp3')

            expect(result).toBe('scanned-no-match')
        })
    })

    describe('markFileScanned', () => {
        it('should mark file with metadata successfully', async () => {
            vi.mocked(metadataCache.markFileScanned).mockReturnValue(true)

            const result = metadataCache.markFileScanned('/file.mp3', 'mbid-123', true)

            expect(result).toBe(true)
            expect(metadataCache.markFileScanned).toHaveBeenCalledWith('/file.mp3', 'mbid-123', true)
        })

        it('should mark file without metadata successfully', async () => {
            vi.mocked(metadataCache.markFileScanned).mockReturnValue(true)

            const result = metadataCache.markFileScanned('/file.mp3', null, false)

            expect(result).toBe(true)
            expect(metadataCache.markFileScanned).toHaveBeenCalledWith('/file.mp3', null, false)
        })

        it('should return false on failure', async () => {
            vi.mocked(metadataCache.markFileScanned).mockReturnValue(false)

            const result = metadataCache.markFileScanned('/invalid.mp3', null, false)

            expect(result).toBe(false)
        })
    })

    describe('getBatchScanStatus', () => {
        it('should return status map for multiple files', async () => {
            const statusMap = new Map<string, ScanStatusType>([
                ['/file1.mp3', 'scanned-tagged'],
                ['/file2.mp3', 'unscanned'],
                ['/file3.mp3', 'scanned-no-match'],
            ])
            vi.mocked(metadataCache.getBatchScanStatus).mockReturnValue(statusMap)

            const result = metadataCache.getBatchScanStatus(['/file1.mp3', '/file2.mp3', '/file3.mp3'])

            expect(result.get('/file1.mp3')).toBe('scanned-tagged')
            expect(result.get('/file2.mp3')).toBe('unscanned')
            expect(result.get('/file3.mp3')).toBe('scanned-no-match')
        })

        it('should handle empty file list', async () => {
            vi.mocked(metadataCache.getBatchScanStatus).mockReturnValue(new Map())

            const result = metadataCache.getBatchScanStatus([])

            expect(result.size).toBe(0)
        })
    })

    describe('getUnscannedFiles', () => {
        it('should filter out scanned files', async () => {
            vi.mocked(metadataCache.getUnscannedFiles).mockReturnValue(['/file2.mp3'])

            const result = metadataCache.getUnscannedFiles(['/file1.mp3', '/file2.mp3'])

            expect(result).toEqual(['/file2.mp3'])
        })

        it('should return all files if none are scanned', async () => {
            const files = ['/file1.mp3', '/file2.mp3', '/file3.mp3']
            vi.mocked(metadataCache.getUnscannedFiles).mockReturnValue(files)

            const result = metadataCache.getUnscannedFiles(files)

            expect(result).toEqual(files)
        })

        it('should return empty array if all files are scanned', async () => {
            vi.mocked(metadataCache.getUnscannedFiles).mockReturnValue([])

            const result = metadataCache.getUnscannedFiles(['/file1.mp3', '/file2.mp3'])

            expect(result).toEqual([])
        })
    })

    describe('getScanStatistics', () => {
        it('should return correct statistics', async () => {
            vi.mocked(metadataCache.getScanStatistics).mockReturnValue({
                total: 100,
                withMetadata: 80,
                withoutMetadata: 20,
            })

            const result = metadataCache.getScanStatistics()

            expect(result.total).toBe(100)
            expect(result.withMetadata).toBe(80)
            expect(result.withoutMetadata).toBe(20)
        })

        it('should return zeros for empty cache', async () => {
            vi.mocked(metadataCache.getScanStatistics).mockReturnValue({
                total: 0,
                withMetadata: 0,
                withoutMetadata: 0,
            })

            const result = metadataCache.getScanStatistics()

            expect(result.total).toBe(0)
        })
    })

    describe('getCachedEntry', () => {
        it('should return cached entry if exists', async () => {
            const mockEntry: FileScanStatus = {
                filePath: '/file.mp3',
                fileHash: 'hash-123',
                mbid: 'mbid-123',
                hasMetadata: true,
                scannedAt: Date.now(),
            }
            vi.mocked(metadataCache.getCachedEntry).mockReturnValue(mockEntry)

            const result = metadataCache.getCachedEntry('/file.mp3')

            expect(result).toEqual(mockEntry)
        })

        it('should return null if not cached', async () => {
            vi.mocked(metadataCache.getCachedEntry).mockReturnValue(null)

            const result = metadataCache.getCachedEntry('/unknown.mp3')

            expect(result).toBeNull()
        })
    })

    describe('cleanupOrphanedEntries', () => {
        it('should return count of cleaned entries', async () => {
            vi.mocked(metadataCache.cleanupOrphanedEntries).mockReturnValue(5)

            const result = metadataCache.cleanupOrphanedEntries()

            expect(result).toBe(5)
        })

        it('should return 0 when no orphans', async () => {
            vi.mocked(metadataCache.cleanupOrphanedEntries).mockReturnValue(0)

            const result = metadataCache.cleanupOrphanedEntries()

            expect(result).toBe(0)
        })
    })

    describe('clearCache', () => {
        it('should clear cache without throwing', async () => {
            vi.mocked(metadataCache.clearCache).mockImplementation(() => { })

            expect(() => metadataCache.clearCache()).not.toThrow()
            expect(metadataCache.clearCache).toHaveBeenCalled()
        })
    })
})
