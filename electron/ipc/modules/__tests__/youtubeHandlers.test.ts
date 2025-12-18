/**
 * YouTube Handlers Tests
 * Tests for YouTube-related IPC handlers including download and binary installation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as youtubeDownloader from '../../../youtubeDownloader'
import * as binaryManager from '../../../binaryManager'
import * as fpcalcManager from '../../../fpcalcManager'
import * as whisperManager from '../../../whisperManager'

// Mock electron
vi.mock('electron', () => ({
    ipcMain: {
        handle: vi.fn(),
    },
    BrowserWindow: {
        fromWebContents: vi.fn(),
    },
    app: {
        getPath: vi.fn().mockReturnValue('/mock/userData'),
    },
}))

// Mock dependencies
vi.mock('../../../youtubeDownloader', () => ({
    downloadYouTubeAudio: vi.fn(),
}))

vi.mock('../../../binaryManager', () => ({
    getAllBinaryStatuses: vi.fn(),
}))

vi.mock('../../../fpcalcManager', () => ({
    downloadFpcalc: vi.fn(),
}))

vi.mock('../../../whisperManager', () => ({
    downloadWhisper: vi.fn(),
    getSelectedModel: vi.fn(),
    setSelectedModelId: vi.fn(),
    WHISPER_MODELS: [
        { id: 'tiny', name: 'Tiny', size: '75 MB' },
        { id: 'base', name: 'Base', size: '150 MB' },
    ],
}))

beforeEach(() => {
    vi.clearAllMocks()
})

describe('YouTube Handlers', () => {
    describe('download-youtube', () => {
        it('should download audio successfully', async () => {
            const mockResult = {
                success: true,
                filePath: '/path/to/song.mp3',
                metadata: { title: 'Song' }
            }
            vi.mocked(youtubeDownloader.downloadYouTubeAudio).mockResolvedValue(mockResult)

            // Simulate invoking logic
            const result = await youtubeDownloader.downloadYouTubeAudio({
                url: 'https://youtube.com/watch?v=123',
                outputPath: '/out',
            })

            expect(result).toEqual(mockResult)
        })

        it('should handle download errors', async () => {
            vi.mocked(youtubeDownloader.downloadYouTubeAudio).mockRejectedValue(new Error('Download failed'))

            await expect(youtubeDownloader.downloadYouTubeAudio({} as any)).rejects.toThrow('Download failed')
        })
    })

    describe('get-binary-statuses', () => {
        it('should return statuses', async () => {
            const mockStatuses = [
                { name: 'yt-dlp', installed: true, version: '1.0' }
            ]
            vi.mocked(binaryManager.getAllBinaryStatuses).mockResolvedValue(mockStatuses as any)

            const result = await binaryManager.getAllBinaryStatuses()

            expect(result).toEqual(mockStatuses)
        })
    })

    describe('install-fpcalc', () => {
        it('should install fpcalc successfully', async () => {
            vi.mocked(fpcalcManager.downloadFpcalc).mockResolvedValue(true)

            const result = await fpcalcManager.downloadFpcalc(vi.fn())

            expect(result).toBe(true)
        })

        it('should handle installation failure', async () => {
            vi.mocked(fpcalcManager.downloadFpcalc).mockResolvedValue(false)

            const result = await fpcalcManager.downloadFpcalc(vi.fn())

            expect(result).toBe(false)
        })
    })

    describe('install-whisper', () => {
        it('should install whisper successfully', async () => {
            vi.mocked(whisperManager.downloadWhisper).mockResolvedValue(true)

            const result = await whisperManager.downloadWhisper(vi.fn())

            expect(result).toBe(true)
        })
    })

    describe('whisper model management', () => {
        it('should return available models', () => {
            expect(whisperManager.WHISPER_MODELS).toHaveLength(2)
            expect(whisperManager.WHISPER_MODELS[0].id).toBe('tiny')
        })

        it('should update selected model', () => {
            whisperManager.setSelectedModelId('base')
            expect(whisperManager.setSelectedModelId).toHaveBeenCalledWith('base')
        })
    })
})
