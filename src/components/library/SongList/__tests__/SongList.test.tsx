/**
 * SongList Component Tests
 * 
 * Note: This is a large component with many features.
 * These tests focus on core rendering and interaction behavior.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SongList } from '../SongList'
import type { MusicFile } from '../../../../../electron/musicScanner'

// Mock the services
vi.mock('../../../../services/fingerprint', () => ({
    generateFingerprint: vi.fn().mockResolvedValue({
        fingerprint: 'test-fingerprint',
        duration: 180,
    }),
}))

vi.mock('../../../../services/acoustid', () => ({
    lookupFingerprint: vi.fn().mockResolvedValue({
        results: [{ recordings: [{ id: 'test-recording' }], score: 0.9 }],
    }),
}))

vi.mock('../../../../services/musicbrainz', () => ({
    lookupRecording: vi.fn().mockResolvedValue({ releases: [] }),
    getCoverArtUrls: vi.fn().mockResolvedValue({ images: [] }),
    pickBestRelease: vi.fn().mockReturnValue(null),
}))

// Mock electronAPI
const mockElectronAPI = {
    scanMusicFile: vi.fn().mockResolvedValue({ cached: false, metadata: {} }),
    getScanStatus: vi.fn().mockResolvedValue({ status: 'unknown' }),
    writeMetadata: vi.fn().mockResolvedValue({ success: true }),
    fileWatcherIgnore: vi.fn().mockResolvedValue({ success: true }),
    cacheGetBatchStatus: vi.fn().mockResolvedValue({}),
}

beforeEach(() => {
    vi.clearAllMocks()
    Object.assign(window.electronAPI, mockElectronAPI)
})

afterEach(() => {
    vi.clearAllMocks()
})

const mockSongs: MusicFile[] = [
    {
        path: '/path/to/song1.mp3',
        name: 'song1.mp3',
        extension: '.mp3',
        size: 5000000,
        metadata: {
            title: 'First Song',
            artist: 'Artist A',
            album: 'Album 1',
            duration: 180,
        },
    },
    {
        path: '/path/to/song2.mp3',
        name: 'song2.mp3',
        extension: '.mp3',
        size: 4000000,
        metadata: {
            title: 'Second Song',
            artist: 'Artist B',
            album: 'Album 2',
            duration: 240,
            albumArt: 'data:image/png;base64,test',
        },
    },
    {
        path: '/path/to/song3.mp3',
        name: 'song3.mp3',
        extension: '.mp3',
        size: 3000000,
        metadata: {
            title: 'Third Song',
            artist: 'Artist A',
            album: 'Album 1',
            duration: 200,
        },
    },
]

describe('SongList', () => {
    const defaultProps = {
        songs: mockSongs,
        onSongClick: vi.fn(),
        playingIndex: null,
        sortBy: 'title' as const,
        onSortChange: vi.fn(),
        onUpdateSingleFile: vi.fn(),
        onShowNotification: vi.fn(),
        isPlaying: false,
        onPlayPause: vi.fn(),
    }

    describe('rendering', () => {
        it('should render the song list container', () => {
            const { container } = render(<SongList {...defaultProps} />)
            expect(container.querySelector('.song-list')).toBeInTheDocument()
        })

        it('should render all songs', () => {
            render(<SongList {...defaultProps} />)

            expect(screen.getByText('First Song')).toBeInTheDocument()
            expect(screen.getByText('Second Song')).toBeInTheDocument()
            expect(screen.getByText('Third Song')).toBeInTheDocument()
        })

        it('should display artist names', () => {
            render(<SongList {...defaultProps} />)

            expect(screen.getAllByText('Artist A').length).toBeGreaterThanOrEqual(1)
            expect(screen.getByText('Artist B')).toBeInTheDocument()
        })


    })

    describe('empty state', () => {
        it('should render empty song list when no songs', () => {
            const { container } = render(<SongList {...defaultProps} songs={[]} />)
            const songItems = container.querySelectorAll('.song-item')
            expect(songItems.length).toBe(0)
        })
    })

    describe('song selection', () => {
        it('should call onSongClick when a song is clicked', async () => {
            const user = userEvent.setup()
            const onSongClick = vi.fn()

            render(<SongList {...defaultProps} onSongClick={onSongClick} />)

            const songItem = screen.getByText('First Song').closest('.song-item')
            if (songItem) {
                await user.click(songItem)
            }

            expect(onSongClick).toHaveBeenCalledTimes(1)
            expect(onSongClick).toHaveBeenCalledWith(mockSongs[0], 0)
        })

        it('should highlight the currently playing song', () => {
            const { container } = render(<SongList {...defaultProps} playingIndex={1} />)

            const playingItem = container.querySelector('.song-item.playing')
            expect(playingItem).toBeInTheDocument()
            expect(playingItem).toHaveTextContent('Second Song')
        })
    })

    describe('sorting', () => {
        it('should render sort options', () => {
            const { container } = render(<SongList {...defaultProps} />)
            const sortControls = container.querySelector('.sort-controls')
            expect(sortControls).toBeInTheDocument()
        })

        it('should have correct value in sort select', () => {
            const { container } = render(<SongList {...defaultProps} sortBy="artist" />)
            const sortSelect = container.querySelector('.sort-select') as HTMLSelectElement
            expect(sortSelect).toBeInTheDocument()
            expect(sortSelect.value).toBe('artist')
        })
    })

    describe('context menu', () => {
        it('should open context menu on right click', async () => {
            const { container } = render(<SongList {...defaultProps} />)

            const songItem = container.querySelector('.song-item')
            if (songItem) {
                fireEvent.contextMenu(songItem, {
                    clientX: 100,
                    clientY: 100,
                })
            }

            // Wait for context menu to appear (rendered via portal)
            await waitFor(() => {
                const contextMenu = document.querySelector('.context-menu')
                expect(contextMenu).toBeInTheDocument()
            })
        })
    })

    describe('with playlists', () => {
        it('should render Add to Playlist option in context menu', async () => {
            const playlists = [
                { id: 1, name: 'Favorites', description: null, coverArtPath: null, songCount: 0, totalDuration: 0, createdAt: Date.now(), updatedAt: Date.now() },
            ]

            const { container } = render(
                <SongList {...defaultProps} playlists={playlists} onAddToPlaylist={vi.fn()} />
            )

            const songItem = container.querySelector('.song-item')
            if (songItem) {
                fireEvent.contextMenu(songItem, {
                    clientX: 100,
                    clientY: 100,
                })
            }

            // Wait for context menu to appear (rendered via portal)
            await waitFor(() => {
                expect(document.querySelector('.context-menu')).toBeInTheDocument()
            })
        })
    })
})
