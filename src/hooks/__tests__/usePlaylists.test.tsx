/**
 * usePlaylists Hook Tests
 * Tests for playlist CRUD operations and state management
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { usePlaylists } from '../usePlaylists'
import type { Playlist } from '../../types/electron.d'
import type { MusicFile } from '../../../electron/musicScanner'

// Mock playlist data
const mockPlaylists: Playlist[] = [
    {
        id: 1,
        name: 'Favorites',
        description: 'My favorite songs',
        coverArtPath: null,
        songCount: 5,
        totalDuration: 1200,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    },
    {
        id: 2,
        name: 'Workout',
        description: null,
        coverArtPath: null,
        songCount: 10,
        totalDuration: 2400,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    },
]

const mockMusicFiles: MusicFile[] = [
    {
        path: '/music/song1.mp3',
        name: 'song1.mp3',
        extension: '.mp3',
        size: 5000000,
        metadata: { title: 'Song 1', artist: 'Artist 1', duration: 180 },
    },
    {
        path: '/music/song2.mp3',
        name: 'song2.mp3',
        extension: '.mp3',
        size: 4000000,
        metadata: { title: 'Song 2', artist: 'Artist 2', duration: 200 },
    },
]

// Mock electronAPI playlist functions
const mockPlaylistAPI = {
    playlistGetAll: vi.fn().mockResolvedValue({ success: true, playlists: mockPlaylists }),
    playlistCreate: vi.fn(),
    playlistDelete: vi.fn(),
    playlistRename: vi.fn(),
    playlistAddSongs: vi.fn(),
    playlistRemoveSong: vi.fn(),
    playlistGetById: vi.fn(),
    playlistGetSongs: vi.fn(),
}

beforeEach(() => {
    vi.clearAllMocks()
    // Reset to default mock implementation
    mockPlaylistAPI.playlistGetAll.mockResolvedValue({ success: true, playlists: mockPlaylists })
    // Add mocks to window.electronAPI
    Object.assign(window.electronAPI, mockPlaylistAPI)
})

describe('usePlaylists', () => {
    describe('initialization', () => {
        it('should load playlists on mount', async () => {
            const { result } = renderHook(() => usePlaylists())

            await waitFor(() => {
                expect(result.current.playlists).toHaveLength(2)
            })

            expect(mockPlaylistAPI.playlistGetAll).toHaveBeenCalledTimes(1)
        })

        it('should have no active playlist initially', async () => {
            const { result } = renderHook(() => usePlaylists())

            await waitFor(() => {
                expect(result.current.playlists).toHaveLength(2)
            })

            expect(result.current.activePlaylist).toBeNull()
        })

        it('should not be loading after initialization', async () => {
            const { result } = renderHook(() => usePlaylists())

            await waitFor(() => {
                expect(result.current.loading).toBe(false)
            })
        })
    })

    describe('createPlaylist', () => {
        it('should create a playlist and add to state', async () => {
            const newPlaylist: Playlist = {
                id: 3,
                name: 'New Playlist',
                description: 'Test description',
                coverArtPath: null,
                songCount: 0,
                totalDuration: 0,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            }

            mockPlaylistAPI.playlistCreate.mockResolvedValue({
                success: true,
                playlist: newPlaylist,
            })

            const onShowNotification = vi.fn()
            const { result } = renderHook(() => usePlaylists({ onShowNotification }))

            await waitFor(() => {
                expect(result.current.playlists).toHaveLength(2)
            })

            let createdPlaylist: Playlist | null = null
            await act(async () => {
                createdPlaylist = await result.current.createPlaylist('New Playlist', 'Test description')
            })

            expect(createdPlaylist).toEqual(newPlaylist)
            expect(result.current.playlists).toHaveLength(3)
            expect(onShowNotification).toHaveBeenCalledWith(
                'Playlist "New Playlist" created',
                'success'
            )
        })

        it('should handle create failure', async () => {
            mockPlaylistAPI.playlistCreate.mockResolvedValue({
                success: false,
                error: 'Name already exists',
            })

            const onShowNotification = vi.fn()
            const { result } = renderHook(() => usePlaylists({ onShowNotification }))

            await waitFor(() => {
                expect(result.current.playlists).toHaveLength(2)
            })

            let createdPlaylist: Playlist | null = null
            await act(async () => {
                createdPlaylist = await result.current.createPlaylist('Duplicate')
            })

            expect(createdPlaylist).toBeNull()
            expect(result.current.playlists).toHaveLength(2) // No change
            expect(onShowNotification).toHaveBeenCalledWith(
                expect.stringContaining('Failed to create playlist'),
                'error'
            )
        })
    })

    describe('deletePlaylist', () => {
        it('should delete a playlist and remove from state', async () => {
            mockPlaylistAPI.playlistDelete.mockResolvedValue({ success: true })

            const onShowNotification = vi.fn()
            const { result } = renderHook(() => usePlaylists({ onShowNotification }))

            await waitFor(() => {
                expect(result.current.playlists).toHaveLength(2)
            })

            let deleted = false
            await act(async () => {
                deleted = await result.current.deletePlaylist(1)
            })

            expect(deleted).toBe(true)
            expect(result.current.playlists).toHaveLength(1)
            expect(result.current.playlists[0].id).toBe(2)
            expect(onShowNotification).toHaveBeenCalledWith(
                expect.stringContaining('deleted'),
                'success'
            )
        })

        it('should handle delete failure', async () => {
            mockPlaylistAPI.playlistDelete.mockResolvedValue({
                success: false,
                error: 'Playlist not found',
            })

            const onShowNotification = vi.fn()
            const { result } = renderHook(() => usePlaylists({ onShowNotification }))

            await waitFor(() => {
                expect(result.current.playlists).toHaveLength(2)
            })

            let deleted = false
            await act(async () => {
                deleted = await result.current.deletePlaylist(999)
            })

            expect(deleted).toBe(false)
            expect(result.current.playlists).toHaveLength(2) // No change
        })
    })

    describe('renamePlaylist', () => {
        it('should rename a playlist and update state', async () => {
            mockPlaylistAPI.playlistRename.mockResolvedValue({ success: true })

            const onShowNotification = vi.fn()
            const { result } = renderHook(() => usePlaylists({ onShowNotification }))

            await waitFor(() => {
                expect(result.current.playlists).toHaveLength(2)
            })

            let renamed = false
            await act(async () => {
                renamed = await result.current.renamePlaylist(1, 'New Name')
            })

            expect(renamed).toBe(true)
            expect(result.current.playlists.find(p => p.id === 1)?.name).toBe('New Name')
            expect(onShowNotification).toHaveBeenCalledWith(
                'Playlist renamed to "New Name"',
                'success'
            )
        })
    })

    describe('addSongsToPlaylist', () => {
        it('should add songs to playlist and update song count', async () => {
            mockPlaylistAPI.playlistAddSongs.mockResolvedValue({
                success: true,
                added: 2,
                alreadyInPlaylist: 0,
            })

            const onShowNotification = vi.fn()
            const { result } = renderHook(() => usePlaylists({ onShowNotification }))

            await waitFor(() => {
                expect(result.current.playlists).toHaveLength(2)
            })

            let added = false
            await act(async () => {
                added = await result.current.addSongsToPlaylist(1, ['/music/song1.mp3', '/music/song2.mp3'])
            })

            expect(added).toBe(true)
            expect(result.current.playlists.find(p => p.id === 1)?.songCount).toBe(7) // Was 5, added 2
            expect(onShowNotification).toHaveBeenCalledWith(
                expect.stringContaining('Added 2 songs'),
                'success'
            )
        })

        it('should show warning when songs already in playlist', async () => {
            mockPlaylistAPI.playlistAddSongs.mockResolvedValue({
                success: true,
                added: 0,
                alreadyInPlaylist: 2,
            })

            const onShowNotification = vi.fn()
            const { result } = renderHook(() => usePlaylists({ onShowNotification }))

            await waitFor(() => {
                expect(result.current.playlists).toHaveLength(2)
            })

            await act(async () => {
                await result.current.addSongsToPlaylist(1, ['/music/song1.mp3', '/music/song2.mp3'])
            })

            expect(onShowNotification).toHaveBeenCalledWith(
                expect.stringContaining('already in playlist'),
                'warning'
            )
        })
    })

    describe('removeSongFromPlaylist', () => {
        it('should remove a song and update song count', async () => {
            mockPlaylistAPI.playlistRemoveSong.mockResolvedValue({ success: true })

            const onShowNotification = vi.fn()
            const { result } = renderHook(() => usePlaylists({ onShowNotification }))

            await waitFor(() => {
                expect(result.current.playlists).toHaveLength(2)
            })

            let removed = false
            await act(async () => {
                removed = await result.current.removeSongFromPlaylist(1, '/music/song1.mp3')
            })

            expect(removed).toBe(true)
            expect(result.current.playlists.find(p => p.id === 1)?.songCount).toBe(4) // Was 5
            expect(onShowNotification).toHaveBeenCalledWith(
                'Song removed from playlist',
                'success'
            )
        })
    })

    describe('loadPlaylist', () => {
        it('should load playlist with songs', async () => {
            const playlistDetails = { ...mockPlaylists[0] }
            mockPlaylistAPI.playlistGetById.mockResolvedValue({
                success: true,
                playlist: playlistDetails,
            })
            mockPlaylistAPI.playlistGetSongs.mockResolvedValue({
                success: true,
                songPaths: ['/music/song1.mp3', '/music/song2.mp3'],
            })

            const { result } = renderHook(() =>
                usePlaylists({ musicFiles: mockMusicFiles })
            )

            await waitFor(() => {
                expect(result.current.playlists).toHaveLength(2)
            })

            await act(async () => {
                await result.current.loadPlaylist(1)
            })

            expect(result.current.activePlaylist).not.toBeNull()
            expect(result.current.activePlaylist?.id).toBe(1)
            expect(result.current.activePlaylist?.songs).toHaveLength(2)
        })
    })

    describe('clearActivePlaylist', () => {
        it('should clear the active playlist', async () => {
            mockPlaylistAPI.playlistGetById.mockResolvedValue({
                success: true,
                playlist: mockPlaylists[0],
            })
            mockPlaylistAPI.playlistGetSongs.mockResolvedValue({
                success: true,
                songPaths: [],
            })

            const { result } = renderHook(() => usePlaylists())

            await waitFor(() => {
                expect(result.current.playlists).toHaveLength(2)
            })

            // First load a playlist
            await act(async () => {
                await result.current.loadPlaylist(1)
            })

            expect(result.current.activePlaylist).not.toBeNull()

            // Then clear it
            act(() => {
                result.current.clearActivePlaylist()
            })

            expect(result.current.activePlaylist).toBeNull()
        })
    })

    describe('refreshPlaylists', () => {
        it('should refresh playlists from API', async () => {
            const { result } = renderHook(() => usePlaylists())

            await waitFor(() => {
                expect(result.current.playlists).toHaveLength(2)
            })

            // Change the mock to return different data
            const updatedPlaylists = [...mockPlaylists, {
                id: 3,
                name: 'New One',
                description: null,
                coverArtPath: null,
                songCount: 0,
                totalDuration: 0,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            }]
            mockPlaylistAPI.playlistGetAll.mockResolvedValue({
                success: true,
                playlists: updatedPlaylists,
            })

            await act(async () => {
                await result.current.refreshPlaylists()
            })

            expect(result.current.playlists).toHaveLength(3)
        })
    })
})
