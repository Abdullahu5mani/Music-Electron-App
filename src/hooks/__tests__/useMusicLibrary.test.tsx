import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMusicLibrary } from '../useMusicLibrary'
import type { MusicFile } from '../../../electron/musicScanner'

// Mock electronAPI
const mockElectronAPI = {
  scanMusicFolder: vi.fn(),
  readSingleFileMetadata: vi.fn(),
  getSettings: vi.fn().mockResolvedValue({ musicFolderPath: null, downloadFolderPath: null }),
}

beforeEach(() => {
  vi.clearAllMocks()
  global.window.electronAPI = {
    ...global.window.electronAPI,
    ...mockElectronAPI,
  } as any
})

describe('useMusicLibrary', () => {
  const mockFiles: MusicFile[] = [
    {
      path: '/path/to/song1.mp3',
      name: 'song1.mp3',
      extension: '.mp3',
      size: 1000,
      metadata: {
        title: 'Song 1',
        artist: 'Artist 1',
        album: 'Album 1',
      },
    },
    {
      path: '/path/to/song2.mp3',
      name: 'song2.mp3',
      extension: '.mp3',
      size: 2000,
      metadata: {
        title: 'Song 2',
        artist: 'Artist 2',
        album: 'Album 2',
      },
    },
  ]

  it('should initialize with empty state', () => {
    const { result } = renderHook(() => useMusicLibrary())

    expect(result.current.musicFiles).toEqual([])
    expect(result.current.sortedMusicFiles).toEqual([])
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('should scan folder and update music files', async () => {
    mockElectronAPI.scanMusicFolder.mockResolvedValue(mockFiles)

    const { result } = renderHook(() => useMusicLibrary())

    await act(async () => {
      await result.current.scanFolder('/test/path')
    })

    expect(mockElectronAPI.scanMusicFolder).toHaveBeenCalledWith('/test/path')
    // Files will have dateAdded added automatically, so check structure instead
    expect(result.current.musicFiles).toHaveLength(2)
    expect(result.current.musicFiles[0].path).toBe(mockFiles[0].path)
    expect(result.current.musicFiles[1].path).toBe(mockFiles[1].path)
    expect(result.current.loading).toBe(false)
  })

  it('should handle scan errors', async () => {
    const error = new Error('Scan failed')
    mockElectronAPI.scanMusicFolder.mockRejectedValue(error)

    const { result } = renderHook(() => useMusicLibrary())

    await act(async () => {
      await result.current.scanFolder('/test/path')
    })

    expect(result.current.error).toBeTruthy()
    expect(result.current.loading).toBe(false)
  })

  it('should update single file in-place', async () => {
    const updatedFile: MusicFile = {
      path: '/path/to/song1.mp3',
      name: 'song1.mp3',
      extension: '.mp3',
      size: 1000,
      metadata: {
        title: 'Updated Song 1',
        artist: 'Artist 1',
        album: 'Album 1',
      },
    }

    mockElectronAPI.scanMusicFolder.mockResolvedValue(mockFiles)
    mockElectronAPI.readSingleFileMetadata.mockResolvedValue(updatedFile)

    const { result } = renderHook(() => useMusicLibrary())

    // First scan to populate files
    await act(async () => {
      await result.current.scanFolder('/test/path')
    })

    // Update single file
    await act(async () => {
      await result.current.updateSingleFile('/path/to/song1.mp3')
    })

    expect(mockElectronAPI.readSingleFileMetadata).toHaveBeenCalledWith('/path/to/song1.mp3')
    expect(result.current.musicFiles[0].metadata?.title).toBe('Updated Song 1')
    // Other file unchanged (may have dateAdded, so check path and metadata)
    expect(result.current.musicFiles[1].path).toBe(mockFiles[1].path)
    expect(result.current.musicFiles[1].metadata?.title).toBe(mockFiles[1].metadata?.title)
  })

  it('should sort files by title', async () => {
    const unsortedFiles: MusicFile[] = [
      {
        path: '/path/to/zebra.mp3',
        name: 'zebra.mp3',
        extension: '.mp3',
        size: 1000,
        metadata: { title: 'Zebra' },
      },
      {
        path: '/path/to/apple.mp3',
        name: 'apple.mp3',
        extension: '.mp3',
        size: 2000,
        metadata: { title: 'Apple' },
      },
    ]

    mockElectronAPI.scanMusicFolder.mockResolvedValue(unsortedFiles)

    const { result } = renderHook(() => useMusicLibrary())

    await act(async () => {
      await result.current.scanFolder('/test/path')
    })

    await act(() => {
      result.current.setSortBy('title')
    })

    expect(result.current.sortedMusicFiles[0].metadata?.title).toBe('Apple')
    expect(result.current.sortedMusicFiles[1].metadata?.title).toBe('Zebra')
  })

  it('should handle updateSingleFile when file not found', async () => {
    mockElectronAPI.scanMusicFolder.mockResolvedValue(mockFiles)
    mockElectronAPI.readSingleFileMetadata.mockResolvedValue(null)

    const { result } = renderHook(() => useMusicLibrary())

    await act(async () => {
      await result.current.scanFolder('/test/path')
    })

    const originalFiles = [...result.current.musicFiles]

    await act(async () => {
      await result.current.updateSingleFile('/nonexistent/file.mp3')
    })

    // Files should remain unchanged
    expect(result.current.musicFiles).toEqual(originalFiles)
  })
})

