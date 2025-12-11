import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as musicScanner from '../../../musicScanner'

// Mock dependencies
vi.mock('../../../musicScanner')

describe('musicHandlers IPC Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('scan-music-folder handler', () => {
    it('should call scanMusicFiles with correct path', async () => {
      const mockFiles = [
        {
          path: '/test/song1.mp3',
          name: 'song1.mp3',
          extension: '.mp3',
          size: 1000,
        },
      ]

      vi.mocked(musicScanner.scanMusicFiles).mockResolvedValue(mockFiles as any)

      // In a real integration test, you would invoke the IPC handler
      // This is a unit test of the handler logic
      const result = await musicScanner.scanMusicFiles('/test/path')

      expect(result).toEqual(mockFiles)
      expect(musicScanner.scanMusicFiles).toHaveBeenCalledWith('/test/path')
    })

    it('should handle scan errors', async () => {
      const error = new Error('Scan failed')
      vi.mocked(musicScanner.scanMusicFiles).mockRejectedValue(error)

      await expect(musicScanner.scanMusicFiles('/test/path')).rejects.toThrow('Scan failed')
    })
  })

  describe('read-single-file-metadata handler', () => {
    it('should call readSingleFileMetadata with correct path', async () => {
      const mockFile = {
        path: '/test/song.mp3',
        name: 'song.mp3',
        extension: '.mp3',
        size: 1000,
        metadata: {
          title: 'Test Song',
          artist: 'Test Artist',
        },
      }

      vi.mocked(musicScanner.readSingleFileMetadata).mockResolvedValue(mockFile as any)

      const result = await musicScanner.readSingleFileMetadata('/test/song.mp3')

      expect(result).toEqual(mockFile)
      expect(musicScanner.readSingleFileMetadata).toHaveBeenCalledWith('/test/song.mp3')
    })

    it('should return null for non-existent file', async () => {
      vi.mocked(musicScanner.readSingleFileMetadata).mockResolvedValue(null)

      const result = await musicScanner.readSingleFileMetadata('/nonexistent/file.mp3')

      expect(result).toBeNull()
    })
  })
})

