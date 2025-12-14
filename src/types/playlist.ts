import type { MusicFile } from '../../electron/musicScanner'

/**
 * Represents a playlist in the application
 */
export interface Playlist {
    id: number
    name: string
    description: string | null
    coverArtPath: string | null
    songCount: number
    totalDuration: number
    createdAt: number
    updatedAt: number
}

/**
 * Playlist with full song data loaded
 */
export interface PlaylistWithSongs extends Playlist {
    songs: MusicFile[]
}

/**
 * Represents a song entry in a playlist
 */
export interface PlaylistSong {
    playlistId: number
    filePath: string
    position: number
    addedAt: number
}

/**
 * API response types for playlist operations
 */
export interface PlaylistCreateResponse {
    success: boolean
    playlist?: Playlist
    error?: string
}

export interface PlaylistResponse {
    success: boolean
    error?: string
}

export interface PlaylistGetAllResponse {
    success: boolean
    playlists: Playlist[]
    error?: string
}

export interface PlaylistGetByIdResponse {
    success: boolean
    playlist: Playlist | null
    error?: string
}

export interface PlaylistGetSongsResponse {
    success: boolean
    songPaths: string[]
    error?: string
}

export interface PlaylistContainingSongResponse {
    success: boolean
    playlists: Playlist[]
    error?: string
}

export interface PlaylistIsSongInResponse {
    success: boolean
    isIn: boolean
    error?: string
}

export interface PlaylistCleanupResponse {
    success: boolean
    removedCount: number
    error?: string
}
