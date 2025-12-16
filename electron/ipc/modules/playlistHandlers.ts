import { ipcMain } from 'electron'
import {
    createPlaylist,
    deletePlaylist,
    renamePlaylist,
    updatePlaylistDescription,
    updatePlaylistCoverArt,
    getAllPlaylists,
    getPlaylistById,
    getPlaylistSongPaths,
    addSongsToPlaylist,
    removeSongFromPlaylist,
    reorderPlaylistSongs,
    isSongInPlaylist,
    getPlaylistsContainingSong,
    cleanupMissingSongs
} from '../../playlistDatabase'

/**
 * Register all playlist-related IPC handlers
 */
export function registerPlaylistHandlers(): void {
    // Create a new playlist
    ipcMain.handle('playlist-create', async (_event, name: string, description?: string) => {
        try {
            const playlist = createPlaylist(name, description)
            return { success: !!playlist, playlist }
        } catch (error) {
            console.error('Error creating playlist:', error)
            return { success: false, error: String(error) }
        }
    })

    // Delete a playlist
    ipcMain.handle('playlist-delete', async (_event, playlistId: number) => {
        try {
            const success = deletePlaylist(playlistId)
            return { success }
        } catch (error) {
            console.error('Error deleting playlist:', error)
            return { success: false, error: String(error) }
        }
    })

    // Rename a playlist
    ipcMain.handle('playlist-rename', async (_event, playlistId: number, newName: string) => {
        try {
            const success = renamePlaylist(playlistId, newName)
            return { success }
        } catch (error) {
            console.error('Error renaming playlist:', error)
            return { success: false, error: String(error) }
        }
    })

    // Update playlist description
    ipcMain.handle('playlist-update-description', async (_event, playlistId: number, description: string | null) => {
        try {
            const success = updatePlaylistDescription(playlistId, description)
            return { success }
        } catch (error) {
            console.error('Error updating playlist description:', error)
            return { success: false, error: String(error) }
        }
    })

    // Update playlist cover art
    ipcMain.handle('playlist-update-cover', async (_event, playlistId: number, coverArtPath: string | null) => {
        try {
            const success = updatePlaylistCoverArt(playlistId, coverArtPath)
            return { success }
        } catch (error) {
            console.error('Error updating playlist cover art:', error)
            return { success: false, error: String(error) }
        }
    })

    // Get all playlists
    ipcMain.handle('playlist-get-all', async () => {
        try {
            const playlists = getAllPlaylists()
            return { success: true, playlists }
        } catch (error) {
            console.error('Error getting all playlists:', error)
            return { success: false, playlists: [], error: String(error) }
        }
    })

    // Get a single playlist by ID
    ipcMain.handle('playlist-get-by-id', async (_event, playlistId: number) => {
        try {
            const playlist = getPlaylistById(playlistId)
            return { success: !!playlist, playlist }
        } catch (error) {
            console.error('Error getting playlist:', error)
            return { success: false, playlist: null, error: String(error) }
        }
    })

    // Get song paths in a playlist
    ipcMain.handle('playlist-get-songs', async (_event, playlistId: number) => {
        try {
            const songPaths = getPlaylistSongPaths(playlistId)
            return { success: true, songPaths }
        } catch (error) {
            console.error('Error getting playlist songs:', error)
            return { success: false, songPaths: [], error: String(error) }
        }
    })

    // Add songs to a playlist
    ipcMain.handle('playlist-add-songs', async (_event, playlistId: number, filePaths: string[]) => {
        try {
            const result = addSongsToPlaylist(playlistId, filePaths)
            return {
                success: true,
                added: result.added,
                alreadyInPlaylist: result.alreadyInPlaylist
            }
        } catch (error) {
            console.error('Error adding songs to playlist:', error)
            return { success: false, added: 0, alreadyInPlaylist: 0, error: String(error) }
        }
    })

    // Remove a song from a playlist
    ipcMain.handle('playlist-remove-song', async (_event, playlistId: number, filePath: string) => {
        try {
            const success = removeSongFromPlaylist(playlistId, filePath)
            return { success }
        } catch (error) {
            console.error('Error removing song from playlist:', error)
            return { success: false, error: String(error) }
        }
    })

    // Reorder songs in a playlist
    ipcMain.handle('playlist-reorder-songs', async (
        _event,
        playlistId: number,
        newOrder: Array<{ filePath: string; position: number }>
    ) => {
        try {
            const success = reorderPlaylistSongs(playlistId, newOrder)
            return { success }
        } catch (error) {
            console.error('Error reordering playlist songs:', error)
            return { success: false, error: String(error) }
        }
    })

    // Check if a song is in a playlist
    ipcMain.handle('playlist-is-song-in', async (_event, playlistId: number, filePath: string) => {
        try {
            const isIn = isSongInPlaylist(playlistId, filePath)
            return { success: true, isIn }
        } catch (error) {
            console.error('Error checking if song is in playlist:', error)
            return { success: false, isIn: false, error: String(error) }
        }
    })

    // Get all playlists containing a song
    ipcMain.handle('playlist-get-containing-song', async (_event, filePath: string) => {
        try {
            const playlists = getPlaylistsContainingSong(filePath)
            return { success: true, playlists }
        } catch (error) {
            console.error('Error getting playlists containing song:', error)
            return { success: false, playlists: [], error: String(error) }
        }
    })

    // Clean up missing songs from playlists
    ipcMain.handle('playlist-cleanup-missing', async () => {
        try {
            const removedCount = cleanupMissingSongs()
            return { success: true, removedCount }
        } catch (error) {
            console.error('Error cleaning up missing songs:', error)
            return { success: false, removedCount: 0, error: String(error) }
        }
    })
}
