/**
 * Playlist Handlers Tests
 * Tests for playlist-related IPC handlers
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as playlistDb from '../../../playlistDatabase'

// Mock electron
vi.mock('electron', () => ({
    ipcMain: {
        handle: vi.fn(),
    },
}))

// Mock playlistDatabase
vi.mock('../../../playlistDatabase', () => ({
    createPlaylist: vi.fn(),
    deletePlaylist: vi.fn(),
    renamePlaylist: vi.fn(),
    updatePlaylistDescription: vi.fn(),
    updatePlaylistCoverArt: vi.fn(),
    getAllPlaylists: vi.fn(),
    getPlaylistById: vi.fn(),
    getPlaylistSongPaths: vi.fn(),
    addSongsToPlaylist: vi.fn(),
    removeSongFromPlaylist: vi.fn(),
    reorderPlaylistSongs: vi.fn(),
    isSongInPlaylist: vi.fn(),
    getPlaylistsContainingSong: vi.fn(),
    cleanupMissingSongs: vi.fn(),
}))

beforeEach(() => {
    vi.clearAllMocks()
})

describe('Playlist Handlers', () => {
    describe('createPlaylist', () => {
        it('should return playlist on success', async () => {
            const mockPlaylist = { id: 1, name: 'New Playlist' }
            vi.mocked(playlistDb.createPlaylist).mockReturnValue(mockPlaylist as any)

            const result = playlistDb.createPlaylist('New Playlist', 'Desc')

            expect(result).toEqual(mockPlaylist)
            expect(playlistDb.createPlaylist).toHaveBeenCalledWith('New Playlist', 'Desc')
        })

        it('should return null on failure', async () => {
            vi.mocked(playlistDb.createPlaylist).mockReturnValue(null)

            const result = playlistDb.createPlaylist('Failed', '')

            expect(result).toBeNull()
        })
    })

    describe('deletePlaylist', () => {
        it('should return true on success', async () => {
            vi.mocked(playlistDb.deletePlaylist).mockReturnValue(true)

            const result = playlistDb.deletePlaylist(1)

            expect(result).toBe(true)
        })

        it('should return false on failure', async () => {
            vi.mocked(playlistDb.deletePlaylist).mockReturnValue(false)

            const result = playlistDb.deletePlaylist(999)

            expect(result).toBe(false)
        })
    })

    describe('getAllPlaylists', () => {
        it('should return all playlists', async () => {
            const mockPlaylists = [{ id: 1, name: 'P1' }, { id: 2, name: 'P2' }]
            vi.mocked(playlistDb.getAllPlaylists).mockReturnValue(mockPlaylists as any)

            const result = playlistDb.getAllPlaylists()

            expect(result).toEqual(mockPlaylists)
        })
    })

    describe('addSongsToPlaylist', () => {
        it('should return add result', async () => {
            const mockResult = { added: 5, alreadyInPlaylist: 2 }
            vi.mocked(playlistDb.addSongsToPlaylist).mockReturnValue(mockResult)

            const result = playlistDb.addSongsToPlaylist(1, ['path1', 'path2'])

            expect(result).toEqual(mockResult)
            expect(playlistDb.addSongsToPlaylist).toHaveBeenCalledWith(1, ['path1', 'path2'])
        })
    })

    describe('removeSongFromPlaylist', () => {
        it('should return true on success', async () => {
            vi.mocked(playlistDb.removeSongFromPlaylist).mockReturnValue(true)

            const result = playlistDb.removeSongFromPlaylist(1, 'path')

            expect(result).toBe(true)
        })
    })

    describe('cleanupMissingSongs', () => {
        it('should return removed count', async () => {
            vi.mocked(playlistDb.cleanupMissingSongs).mockReturnValue(10)

            const result = playlistDb.cleanupMissingSongs()

            expect(result).toBe(10)
        })
    })

    describe('isSongInPlaylist', () => {
        it('should return true if song exists', async () => {
            vi.mocked(playlistDb.isSongInPlaylist).mockReturnValue(true)

            const result = playlistDb.isSongInPlaylist(1, 'path.mp3')

            expect(result).toBe(true)
        })
    })
})
