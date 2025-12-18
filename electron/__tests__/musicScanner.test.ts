/**
 * Music Scanner Tests
 * Tests for file scanning and metadata extraction logic
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as musicScanner from '../musicScanner'
import fs from 'node:fs'


// Mock dependencies
vi.mock('node:fs', () => ({
    default: {
        existsSync: vi.fn(),
        statSync: vi.fn(),
        readdirSync: vi.fn(),
    },
    existsSync: vi.fn(),
    statSync: vi.fn(),
    readdirSync: vi.fn(),
}))
vi.mock('music-metadata', () => ({
    parseFile: vi.fn(),
}))
import { parseFile } from 'music-metadata'

describe('musicScanner', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('scanMusicFiles', () => {
        it('should return empty array if directory does not exist', async () => {
            vi.mocked(fs.existsSync).mockReturnValue(false)

            const result = await musicScanner.scanMusicFiles('/bad/path')

            expect(result).toEqual([])
        })

        it('should return empty array if path is not a directory', async () => {
            vi.mocked(fs.existsSync).mockReturnValue(true)
            vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => false } as any)

            const result = await musicScanner.scanMusicFiles('/file/path')

            expect(result).toEqual([])
        })

        it('should scan directory and extract metadata', async () => {
            vi.mocked(fs.existsSync).mockReturnValue(true)
            vi.mocked(fs.statSync).mockReturnValue({
                isDirectory: () => true,
                size: 1024,
                mtimeMs: 1000
            } as any)

            // Mock readdir to return one file
            vi.mocked(fs.readdirSync).mockReturnValue([
                { name: 'song.mp3', isFile: () => true, isDirectory: () => false } as any
            ])

            // Mock metadata parsing
            vi.mocked(parseFile).mockResolvedValue({
                common: {
                    title: 'Test Title',
                    artist: 'Test Artist',
                    picture: []
                },
                format: {
                    duration: 180
                }
            } as any)

            const result = await musicScanner.scanMusicFiles('/music')

            expect(result).toHaveLength(1)
            expect(result[0].name).toBe('song.mp3')
            expect(result[0].metadata?.title).toBe('Test Title')
        })

        it('should recursively scan temporary directories', async () => {
            vi.mocked(fs.existsSync).mockReturnValue(true)

            // First call (root dir): returns subdir
            // Second call (subdir): returns file
            vi.mocked(fs.readdirSync)
                .mockReturnValueOnce([
                    { name: 'subdir', isFile: () => false, isDirectory: () => true } as any
                ])
                .mockReturnValueOnce([
                    { name: 'song.flac', isFile: () => true, isDirectory: () => false } as any
                ])

            vi.mocked(fs.statSync).mockReturnValue({
                isDirectory: () => true,
                size: 2048,
                mtimeMs: 2000
            } as any)

            vi.mocked(parseFile).mockResolvedValue({
                common: { title: 'Flac Song' },
                format: {}
            } as any)

            const result = await musicScanner.scanMusicFiles('/root')

            expect(result).toHaveLength(1)
            expect(result[0].name).toBe('song.flac')
        })
    })

    describe('readSingleFileMetadata', () => {
        it('should return null if file does not exist', async () => {
            vi.mocked(fs.existsSync).mockReturnValue(false)

            const result = await musicScanner.readSingleFileMetadata('/missing.mp3')

            expect(result).toBeNull()
        })

        it('should return null if extension is not supported', async () => {
            vi.mocked(fs.existsSync).mockReturnValue(true)

            const result = await musicScanner.readSingleFileMetadata('/text.txt')

            expect(result).toBeNull()
        })

        it('should read metadata for valid file', async () => {
            vi.mocked(fs.existsSync).mockReturnValue(true)
            vi.mocked(fs.statSync).mockReturnValue({ size: 500, mtimeMs: 123 } as any)

            vi.mocked(parseFile).mockResolvedValue({
                common: { title: 'Single Song' },
                format: { duration: 200 }
            } as any)

            const result = await musicScanner.readSingleFileMetadata('/song.mp3')

            expect(result?.metadata?.title).toBe('Single Song')
            expect(result?.size).toBe(500)
        })

        it('should handle album art extraction', async () => {
            vi.mocked(fs.existsSync).mockReturnValue(true)
            vi.mocked(fs.statSync).mockReturnValue({ size: 500, mtimeMs: 123 } as any)

            vi.mocked(parseFile).mockResolvedValue({
                common: {
                    title: 'Art Song',
                    picture: [{
                        data: Buffer.from('fake-image'),
                        format: 'image/jpeg'
                    }]
                },
                format: {}
            } as any)

            const result = await musicScanner.readSingleFileMetadata('/art.mp3')

            expect(result?.metadata?.albumArt).toContain('base64')
            expect(result?.metadata?.albumArt).toContain('image/jpeg')
        })
    })
})
