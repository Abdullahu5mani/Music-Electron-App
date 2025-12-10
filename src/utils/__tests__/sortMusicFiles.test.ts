import { describe, it, expect } from 'vitest'
import { sortMusicFiles } from '../sortMusicFiles'
import type { MusicFile } from '../../../electron/musicScanner'

describe('sortMusicFiles', () => {
  const mockFiles: MusicFile[] = [
    {
      path: '/path/to/song1.mp3',
      name: 'song1.mp3',
      extension: '.mp3',
      size: 1000,
      metadata: {
        title: 'Zebra',
        artist: 'Beach House',
        album: 'Bloom',
        track: { no: 1, of: 10 },
      },
    },
    {
      path: '/path/to/song2.mp3',
      name: 'song2.mp3',
      extension: '.mp3',
      size: 2000,
      metadata: {
        title: 'Apple',
        artist: 'Beach House',
        album: 'Bloom',
        track: { no: 2, of: 10 },
      },
    },
    {
      path: '/path/to/song3.mp3',
      name: 'song3.mp3',
      extension: '.mp3',
      size: 3000,
      metadata: {
        title: 'Myth',
        artist: 'Beach House',
        album: 'Bloom',
        track: { no: 3, of: 10 },
      },
    },
    {
      path: '/path/to/song4.mp3',
      name: 'song4.mp3',
      extension: '.mp3',
      size: 4000,
      metadata: {
        title: 'Wild',
        artist: 'Beach House',
        album: 'Teen Dream',
        track: { no: 1, of: 10 },
      },
    },
  ]

  it('should sort by title alphabetically', () => {
    const sorted = sortMusicFiles(mockFiles, 'title')
    expect(sorted[0].metadata?.title).toBe('Apple')
    expect(sorted[1].metadata?.title).toBe('Myth')
    expect(sorted[2].metadata?.title).toBe('Wild')
    expect(sorted[3].metadata?.title).toBe('Zebra')
  })

  it('should sort by artist, then by title', () => {
    const filesWithDifferentArtists: MusicFile[] = [
      {
        path: '/path/to/song1.mp3',
        name: 'song1.mp3',
        extension: '.mp3',
        size: 1000,
        metadata: {
          title: 'Zebra',
          artist: 'Beach House',
        },
      },
      {
        path: '/path/to/song2.mp3',
        name: 'song2.mp3',
        extension: '.mp3',
        size: 2000,
        metadata: {
          title: 'Apple',
          artist: 'Arctic Monkeys',
        },
      },
      {
        path: '/path/to/song3.mp3',
        name: 'song3.mp3',
        extension: '.mp3',
        size: 3000,
        metadata: {
          title: 'Myth',
          artist: 'Beach House',
        },
      },
    ]

    const sorted = sortMusicFiles(filesWithDifferentArtists, 'artist')
    expect(sorted[0].metadata?.artist).toBe('Arctic Monkeys')
    expect(sorted[1].metadata?.artist).toBe('Beach House')
    expect(sorted[1].metadata?.title).toBe('Myth') // Sorted by title within same artist
    expect(sorted[2].metadata?.artist).toBe('Beach House')
    expect(sorted[2].metadata?.title).toBe('Zebra')
  })

  it('should sort by track number within album', () => {
    const sorted = sortMusicFiles(mockFiles, 'track')
    // Should be sorted by album first, then track number
    expect(sorted[0].metadata?.album).toBe('Bloom')
    expect(sorted[0].metadata?.track?.no).toBe(1)
    expect(sorted[1].metadata?.track?.no).toBe(2)
    expect(sorted[2].metadata?.track?.no).toBe(3)
    expect(sorted[3].metadata?.album).toBe('Teen Dream')
    expect(sorted[3].metadata?.track?.no).toBe(1)
  })

  it('should sort by dateAdded (newest first)', () => {
    const filesWithDates = mockFiles.map((file, index) => ({
      ...file,
      dateAdded: Date.now() - (index * 1000), // Older files have smaller timestamps
    }))

    const sorted = sortMusicFiles(filesWithDates as any, 'dateAdded')
    // Newest first (largest timestamp)
    expect((sorted[0] as any).dateAdded).toBeGreaterThan((sorted[1] as any).dateAdded)
    expect((sorted[1] as any).dateAdded).toBeGreaterThan((sorted[2] as any).dateAdded)
  })

  it('should handle files without metadata', () => {
    const filesWithoutMetadata: MusicFile[] = [
      {
        path: '/path/to/song1.mp3',
        name: 'zebra.mp3',
        extension: '.mp3',
        size: 1000,
      },
      {
        path: '/path/to/song2.mp3',
        name: 'apple.mp3',
        extension: '.mp3',
        size: 2000,
      },
    ]

    const sorted = sortMusicFiles(filesWithoutMetadata, 'title')
    expect(sorted[0].name).toBe('apple.mp3')
    expect(sorted[1].name).toBe('zebra.mp3')
  })

  it('should handle files without artist metadata', () => {
    const filesWithoutArtist: MusicFile[] = [
      {
        path: '/path/to/song1.mp3',
        name: 'song1.mp3',
        extension: '.mp3',
        size: 1000,
        metadata: {
          title: 'Song 1',
        },
      },
      {
        path: '/path/to/song2.mp3',
        name: 'song2.mp3',
        extension: '.mp3',
        size: 2000,
        metadata: {
          title: 'Song 2',
        },
      },
    ]

    const sorted = sortMusicFiles(filesWithoutArtist, 'artist')
    expect(sorted[0].metadata?.title).toBe('Song 1')
    expect(sorted[1].metadata?.title).toBe('Song 2')
  })

  it('should not mutate the original array', () => {
    const original = [...mockFiles]
    sortMusicFiles(mockFiles, 'title')
    expect(mockFiles).toEqual(original)
  })
})

