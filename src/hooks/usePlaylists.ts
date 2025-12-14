import { useState, useCallback, useEffect } from 'react'
import type { Playlist, PlaylistWithSongs } from '../types/electron.d'
import type { MusicFile } from '../../electron/musicScanner'

interface UsePlaylistsOptions {
    onShowNotification?: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void
    musicFiles?: MusicFile[]  // All loaded music files to resolve song paths to full MusicFile objects
}

interface UsePlaylistsReturn {
    playlists: Playlist[]
    activePlaylist: PlaylistWithSongs | null
    loading: boolean
    // CRUD operations
    createPlaylist: (name: string, description?: string) => Promise<Playlist | null>
    deletePlaylist: (playlistId: number) => Promise<boolean>
    renamePlaylist: (playlistId: number, newName: string) => Promise<boolean>
    // Song operations
    addSongsToPlaylist: (playlistId: number, filePaths: string[]) => Promise<boolean>
    removeSongFromPlaylist: (playlistId: number, filePath: string) => Promise<boolean>
    // Navigation
    loadPlaylist: (playlistId: number) => Promise<void>
    clearActivePlaylist: () => void
    // Refresh
    refreshPlaylists: () => Promise<void>
}

/**
 * Hook for managing playlists
 * Handles CRUD operations and maintains playlist state
 */
export function usePlaylists({
    onShowNotification,
    musicFiles = []
}: UsePlaylistsOptions = {}): UsePlaylistsReturn {
    const [playlists, setPlaylists] = useState<Playlist[]>([])
    const [activePlaylist, setActivePlaylist] = useState<PlaylistWithSongs | null>(null)
    const [loading, setLoading] = useState(false)

    /**
     * Load all playlists from the database
     */
    const refreshPlaylists = useCallback(async () => {
        try {
            const result = await window.electronAPI.playlistGetAll()
            if (result.success) {
                setPlaylists(result.playlists)
            } else {
                console.error('Failed to load playlists:', result.error)
            }
        } catch (error) {
            console.error('Error loading playlists:', error)
        }
    }, [])

    /**
     * Load playlists on mount
     */
    useEffect(() => {
        refreshPlaylists()
    }, [refreshPlaylists])

    /**
     * Create a new playlist
     */
    const createPlaylist = useCallback(async (
        name: string,
        description?: string
    ): Promise<Playlist | null> => {
        try {
            const result = await window.electronAPI.playlistCreate(name, description)

            if (result.success && result.playlist) {
                // Add to local state
                setPlaylists(prev => [result.playlist!, ...prev])
                onShowNotification?.(`Playlist "${name}" created`, 'success')
                return result.playlist
            } else {
                onShowNotification?.(`Failed to create playlist: ${result.error}`, 'error')
                return null
            }
        } catch (error) {
            console.error('Error creating playlist:', error)
            onShowNotification?.('Failed to create playlist', 'error')
            return null
        }
    }, [onShowNotification])

    /**
     * Delete a playlist
     */
    const deletePlaylist = useCallback(async (playlistId: number): Promise<boolean> => {
        try {
            const playlist = playlists.find(p => p.id === playlistId)
            const result = await window.electronAPI.playlistDelete(playlistId)

            if (result.success) {
                // Remove from local state
                setPlaylists(prev => prev.filter(p => p.id !== playlistId))
                // Clear active playlist if it was deleted
                if (activePlaylist?.id === playlistId) {
                    setActivePlaylist(null)
                }
                onShowNotification?.(`Playlist "${playlist?.name || 'Unknown'}" deleted`, 'success')
                return true
            } else {
                onShowNotification?.(`Failed to delete playlist: ${result.error}`, 'error')
                return false
            }
        } catch (error) {
            console.error('Error deleting playlist:', error)
            onShowNotification?.('Failed to delete playlist', 'error')
            return false
        }
    }, [playlists, activePlaylist, onShowNotification])

    /**
     * Rename a playlist
     */
    const renamePlaylist = useCallback(async (
        playlistId: number,
        newName: string
    ): Promise<boolean> => {
        try {
            const result = await window.electronAPI.playlistRename(playlistId, newName)

            if (result.success) {
                // Update local state
                setPlaylists(prev => prev.map(p =>
                    p.id === playlistId ? { ...p, name: newName, updatedAt: Date.now() } : p
                ))
                // Update active playlist if it was renamed
                if (activePlaylist?.id === playlistId) {
                    setActivePlaylist(prev => prev ? { ...prev, name: newName } : null)
                }
                onShowNotification?.(`Playlist renamed to "${newName}"`, 'success')
                return true
            } else {
                onShowNotification?.(`Failed to rename playlist: ${result.error}`, 'error')
                return false
            }
        } catch (error) {
            console.error('Error renaming playlist:', error)
            onShowNotification?.('Failed to rename playlist', 'error')
            return false
        }
    }, [activePlaylist, onShowNotification])

    /**
     * Add songs to a playlist
     */
    const addSongsToPlaylist = useCallback(async (
        playlistId: number,
        filePaths: string[]
    ): Promise<boolean> => {
        try {
            const playlist = playlists.find(p => p.id === playlistId)
            const result = await window.electronAPI.playlistAddSongs(playlistId, filePaths)

            if (result.success) {
                // Update song count in local state
                setPlaylists(prev => prev.map(p =>
                    p.id === playlistId
                        ? { ...p, songCount: p.songCount + filePaths.length, updatedAt: Date.now() }
                        : p
                ))

                // If this is the active playlist, reload it
                if (activePlaylist?.id === playlistId) {
                    await loadPlaylist(playlistId)
                }

                const songText = filePaths.length === 1 ? 'song' : 'songs'
                onShowNotification?.(
                    `Added ${filePaths.length} ${songText} to "${playlist?.name || 'playlist'}"`,
                    'success'
                )
                return true
            } else {
                onShowNotification?.(`Failed to add songs: ${result.error}`, 'error')
                return false
            }
        } catch (error) {
            console.error('Error adding songs to playlist:', error)
            onShowNotification?.('Failed to add songs to playlist', 'error')
            return false
        }
    }, [playlists, activePlaylist, onShowNotification])

    /**
     * Remove a song from a playlist
     */
    const removeSongFromPlaylist = useCallback(async (
        playlistId: number,
        filePath: string
    ): Promise<boolean> => {
        try {
            const result = await window.electronAPI.playlistRemoveSong(playlistId, filePath)

            if (result.success) {
                // Update song count in local state
                setPlaylists(prev => prev.map(p =>
                    p.id === playlistId
                        ? { ...p, songCount: Math.max(0, p.songCount - 1), updatedAt: Date.now() }
                        : p
                ))

                // If this is the active playlist, update it
                if (activePlaylist?.id === playlistId) {
                    setActivePlaylist(prev => {
                        if (!prev) return null
                        return {
                            ...prev,
                            songs: prev.songs.filter(s => s.path !== filePath),
                            songCount: Math.max(0, prev.songCount - 1)
                        }
                    })
                }

                onShowNotification?.('Song removed from playlist', 'success')
                return true
            } else {
                onShowNotification?.(`Failed to remove song: ${result.error}`, 'error')
                return false
            }
        } catch (error) {
            console.error('Error removing song from playlist:', error)
            onShowNotification?.('Failed to remove song from playlist', 'error')
            return false
        }
    }, [activePlaylist, onShowNotification])

    /**
     * Load a playlist with its songs
     */
    const loadPlaylist = useCallback(async (playlistId: number): Promise<void> => {
        setLoading(true)
        try {
            // Get playlist info
            const playlistResult = await window.electronAPI.playlistGetById(playlistId)
            if (!playlistResult.success || !playlistResult.playlist) {
                console.error('Failed to load playlist:', playlistResult.error)
                return
            }

            // Get song paths
            const songsResult = await window.electronAPI.playlistGetSongs(playlistId)
            if (!songsResult.success) {
                console.error('Failed to load playlist songs:', songsResult.error)
                return
            }

            // Resolve file paths to full MusicFile objects
            const songs: MusicFile[] = songsResult.songPaths
                .map(path => musicFiles.find(f => f.path === path))
                .filter((f): f is MusicFile => f !== undefined)

            // Calculate total duration
            const totalDuration = songs.reduce((sum, song) => sum + (song.metadata?.duration || 0), 0)

            setActivePlaylist({
                ...playlistResult.playlist,
                songs,
                totalDuration
            })
        } catch (error) {
            console.error('Error loading playlist:', error)
        } finally {
            setLoading(false)
        }
    }, [musicFiles])

    /**
     * Clear the active playlist
     */
    const clearActivePlaylist = useCallback(() => {
        setActivePlaylist(null)
    }, [])

    return {
        playlists,
        activePlaylist,
        loading,
        createPlaylist,
        deletePlaylist,
        renamePlaylist,
        addSongsToPlaylist,
        removeSongFromPlaylist,
        loadPlaylist,
        clearActivePlaylist,
        refreshPlaylists
    }
}
