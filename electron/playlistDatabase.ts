import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'
import fs from 'fs'

/**
 * Playlist Database Module
 * 
 * Uses SQLite to store and manage playlists and their songs.
 * 
 * Tables:
 * - playlists: Stores playlist metadata (name, description, etc.)
 * - playlist_songs: Stores the songs in each playlist with ordering
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

export interface PlaylistSong {
    playlistId: number
    filePath: string
    position: number
    addedAt: number
}

let db: Database.Database | null = null

/**
 * Get the database file path in user data directory
 */
function getDatabasePath(): string {
    const userDataPath = app.getPath('userData')
    return path.join(userDataPath, 'playlists.db')
}

/**
 * Initialize the database connection and create tables if needed
 */
export function initializePlaylistDatabase(): Database.Database {
    if (db) return db

    const dbPath = getDatabasePath()

    // Ensure the directory exists
    const dir = path.dirname(dbPath)
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
    }

    db = new Database(dbPath)

    // Create the playlists table if it doesn't exist
    db.exec(`
    CREATE TABLE IF NOT EXISTS playlists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      coverArtPath TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    )
  `)

    // Create the playlist_songs table if it doesn't exist
    db.exec(`
    CREATE TABLE IF NOT EXISTS playlist_songs (
      playlistId INTEGER NOT NULL,
      filePath TEXT NOT NULL,
      position INTEGER NOT NULL,
      addedAt INTEGER NOT NULL,
      PRIMARY KEY (playlistId, filePath),
      FOREIGN KEY (playlistId) REFERENCES playlists(id) ON DELETE CASCADE
    )
  `)

    // Create indexes for faster lookups
    db.exec(`
    CREATE INDEX IF NOT EXISTS idx_playlist_songs_playlist ON playlist_songs(playlistId)
  `)
    db.exec(`
    CREATE INDEX IF NOT EXISTS idx_playlist_songs_position ON playlist_songs(playlistId, position)
  `)

    return db
}

/**
 * Close the database connection
 */
export function closePlaylistDatabase(): void {
    if (db) {
        db.close()
        db = null
    }
}

/**
 * Create a new playlist
 */
export function createPlaylist(name: string, description?: string): Playlist | null {
    const database = initializePlaylistDatabase()
    const now = Date.now()

    try {
        const stmt = database.prepare(`
      INSERT INTO playlists (name, description, createdAt, updatedAt)
      VALUES (?, ?, ?, ?)
    `)

        const result = stmt.run(name, description || null, now, now)

        return {
            id: result.lastInsertRowid as number,
            name,
            description: description || null,
            coverArtPath: null,
            songCount: 0,
            totalDuration: 0,
            createdAt: now,
            updatedAt: now
        }
    } catch (error) {
        console.error('Error creating playlist:', error)
        return null
    }
}

/**
 * Delete a playlist and all its songs
 */
export function deletePlaylist(playlistId: number): boolean {
    const database = initializePlaylistDatabase()

    try {
        // Delete songs first (due to foreign key constraint)
        database.prepare('DELETE FROM playlist_songs WHERE playlistId = ?').run(playlistId)
        // Delete the playlist
        const result = database.prepare('DELETE FROM playlists WHERE id = ?').run(playlistId)
        return result.changes > 0
    } catch (error) {
        console.error('Error deleting playlist:', error)
        return false
    }
}

/**
 * Rename a playlist
 */
export function renamePlaylist(playlistId: number, newName: string): boolean {
    const database = initializePlaylistDatabase()

    try {
        const result = database.prepare(`
      UPDATE playlists SET name = ?, updatedAt = ? WHERE id = ?
    `).run(newName, Date.now(), playlistId)
        return result.changes > 0
    } catch (error) {
        console.error('Error renaming playlist:', error)
        return false
    }
}

/**
 * Update playlist description
 */
export function updatePlaylistDescription(playlistId: number, description: string | null): boolean {
    const database = initializePlaylistDatabase()

    try {
        const result = database.prepare(`
      UPDATE playlists SET description = ?, updatedAt = ? WHERE id = ?
    `).run(description, Date.now(), playlistId)
        return result.changes > 0
    } catch (error) {
        console.error('Error updating playlist description:', error)
        return false
    }
}

/**
 * Update playlist cover art
 */
export function updatePlaylistCoverArt(playlistId: number, coverArtPath: string | null): boolean {
    const database = initializePlaylistDatabase()

    try {
        const result = database.prepare(`
      UPDATE playlists SET coverArtPath = ?, updatedAt = ? WHERE id = ?
    `).run(coverArtPath, Date.now(), playlistId)
        return result.changes > 0
    } catch (error) {
        console.error('Error updating playlist cover art:', error)
        return false
    }
}

/**
 * Get all playlists with song count and total duration
 */
export function getAllPlaylists(): Playlist[] {
    const database = initializePlaylistDatabase()

    try {
        const rows = database.prepare(`
      SELECT 
        p.id,
        p.name,
        p.description,
        p.coverArtPath,
        p.createdAt,
        p.updatedAt,
        COUNT(ps.filePath) as songCount
      FROM playlists p
      LEFT JOIN playlist_songs ps ON p.id = ps.playlistId
      GROUP BY p.id
      ORDER BY p.updatedAt DESC
    `).all() as Array<{
            id: number
            name: string
            description: string | null
            coverArtPath: string | null
            createdAt: number
            updatedAt: number
            songCount: number
        }>

        return rows.map(row => ({
            ...row,
            totalDuration: 0 // Duration will be calculated when loading with songs
        }))
    } catch (error) {
        console.error('Error getting all playlists:', error)
        return []
    }
}

/**
 * Get a single playlist by ID
 */
export function getPlaylistById(playlistId: number): Playlist | null {
    const database = initializePlaylistDatabase()

    try {
        const row = database.prepare(`
      SELECT 
        p.id,
        p.name,
        p.description,
        p.coverArtPath,
        p.createdAt,
        p.updatedAt,
        COUNT(ps.filePath) as songCount
      FROM playlists p
      LEFT JOIN playlist_songs ps ON p.id = ps.playlistId
      WHERE p.id = ?
      GROUP BY p.id
    `).get(playlistId) as {
            id: number
            name: string
            description: string | null
            coverArtPath: string | null
            createdAt: number
            updatedAt: number
            songCount: number
        } | undefined

        if (!row) return null

        return {
            ...row,
            totalDuration: 0
        }
    } catch (error) {
        console.error('Error getting playlist by ID:', error)
        return null
    }
}

/**
 * Get all song file paths in a playlist, ordered by position
 */
export function getPlaylistSongPaths(playlistId: number): string[] {
    const database = initializePlaylistDatabase()

    try {
        const rows = database.prepare(`
      SELECT filePath FROM playlist_songs 
      WHERE playlistId = ? 
      ORDER BY position ASC
    `).all(playlistId) as Array<{ filePath: string }>

        return rows.map(row => row.filePath)
    } catch (error) {
        console.error('Error getting playlist songs:', error)
        return []
    }
}

/**
 * Add songs to a playlist
 * Returns: { added: number, alreadyInPlaylist: number }
 */
export function addSongsToPlaylist(playlistId: number, filePaths: string[]): { added: number, alreadyInPlaylist: number } {
    const database = initializePlaylistDatabase()

    try {
        // Check which songs are already in the playlist
        const checkStmt = database.prepare(`
      SELECT filePath FROM playlist_songs WHERE playlistId = ? AND filePath = ?
    `)

        const existingSongs: string[] = []
        const newSongs: string[] = []

        for (const filePath of filePaths) {
            const existing = checkStmt.get(playlistId, filePath)
            if (existing) {
                existingSongs.push(filePath)
            } else {
                newSongs.push(filePath)
            }
        }

        // If there are no new songs to add, return early
        if (newSongs.length === 0) {
            return { added: 0, alreadyInPlaylist: existingSongs.length }
        }

        // Get current max position
        const maxPosRow = database.prepare(`
      SELECT MAX(position) as maxPos FROM playlist_songs WHERE playlistId = ?
    `).get(playlistId) as { maxPos: number | null } | undefined

        let position = (maxPosRow?.maxPos ?? -1) + 1
        const now = Date.now()

        const insertStmt = database.prepare(`
      INSERT INTO playlist_songs (playlistId, filePath, position, addedAt)
      VALUES (?, ?, ?, ?)
    `)

        const insertMany = database.transaction((paths: string[]) => {
            for (const filePath of paths) {
                insertStmt.run(playlistId, filePath, position++, now)
            }
        })

        insertMany(newSongs)

        // Update playlist's updatedAt timestamp
        database.prepare('UPDATE playlists SET updatedAt = ? WHERE id = ?').run(now, playlistId)

        return { added: newSongs.length, alreadyInPlaylist: existingSongs.length }
    } catch (error) {
        console.error('Error adding songs to playlist:', error)
        return { added: 0, alreadyInPlaylist: 0 }
    }
}

/**
 * Remove a song from a playlist
 */
export function removeSongFromPlaylist(playlistId: number, filePath: string): boolean {
    const database = initializePlaylistDatabase()

    try {
        const result = database.prepare(`
      DELETE FROM playlist_songs WHERE playlistId = ? AND filePath = ?
    `).run(playlistId, filePath)

        if (result.changes > 0) {
            // Reorder remaining songs to close the gap
            reorderAfterRemoval(playlistId)
            // Update playlist's updatedAt timestamp
            database.prepare('UPDATE playlists SET updatedAt = ? WHERE id = ?').run(Date.now(), playlistId)
            return true
        }
        return false
    } catch (error) {
        console.error('Error removing song from playlist:', error)
        return false
    }
}

/**
 * Reorder songs after removal to close gaps in position
 */
function reorderAfterRemoval(playlistId: number): void {
    const database = initializePlaylistDatabase()

    try {
        const songs = database.prepare(`
      SELECT filePath FROM playlist_songs 
      WHERE playlistId = ? 
      ORDER BY position ASC
    `).all(playlistId) as Array<{ filePath: string }>

        const updateStmt = database.prepare(`
      UPDATE playlist_songs SET position = ? 
      WHERE playlistId = ? AND filePath = ?
    `)

        const reorder = database.transaction(() => {
            songs.forEach((song, index) => {
                updateStmt.run(index, playlistId, song.filePath)
            })
        })

        reorder()
    } catch (error) {
        console.error('Error reordering songs:', error)
    }
}

/**
 * Reorder songs in a playlist (drag-and-drop)
 */
export function reorderPlaylistSongs(
    playlistId: number,
    newOrder: Array<{ filePath: string; position: number }>
): boolean {
    const database = initializePlaylistDatabase()

    try {
        const updateStmt = database.prepare(`
      UPDATE playlist_songs SET position = ? 
      WHERE playlistId = ? AND filePath = ?
    `)

        const reorder = database.transaction(() => {
            for (const item of newOrder) {
                updateStmt.run(item.position, playlistId, item.filePath)
            }
        })

        reorder()

        // Update playlist's updatedAt timestamp
        database.prepare('UPDATE playlists SET updatedAt = ? WHERE id = ?').run(Date.now(), playlistId)

        return true
    } catch (error) {
        console.error('Error reordering playlist songs:', error)
        return false
    }
}

/**
 * Check if a song is in a playlist
 */
export function isSongInPlaylist(playlistId: number, filePath: string): boolean {
    const database = initializePlaylistDatabase()

    try {
        const row = database.prepare(`
      SELECT 1 FROM playlist_songs WHERE playlistId = ? AND filePath = ?
    `).get(playlistId, filePath)
        return !!row
    } catch (error) {
        console.error('Error checking if song is in playlist:', error)
        return false
    }
}

/**
 * Get all playlists that contain a specific song
 */
export function getPlaylistsContainingSong(filePath: string): Playlist[] {
    const database = initializePlaylistDatabase()

    try {
        const rows = database.prepare(`
      SELECT DISTINCT 
        p.id,
        p.name,
        p.description,
        p.coverArtPath,
        p.createdAt,
        p.updatedAt,
        (SELECT COUNT(*) FROM playlist_songs WHERE playlistId = p.id) as songCount
      FROM playlists p
      INNER JOIN playlist_songs ps ON p.id = ps.playlistId
      WHERE ps.filePath = ?
    `).all(filePath) as Array<{
            id: number
            name: string
            description: string | null
            coverArtPath: string | null
            createdAt: number
            updatedAt: number
            songCount: number
        }>

        return rows.map(row => ({
            ...row,
            totalDuration: 0
        }))
    } catch (error) {
        console.error('Error getting playlists containing song:', error)
        return []
    }
}

/**
 * Clean up songs from playlists that no longer exist on disk
 */
export function cleanupMissingSongs(): number {
    const database = initializePlaylistDatabase()

    try {
        const songs = database.prepare('SELECT DISTINCT filePath FROM playlist_songs').all() as Array<{ filePath: string }>
        let removed = 0

        const deleteStmt = database.prepare('DELETE FROM playlist_songs WHERE filePath = ?')

        for (const song of songs) {
            if (!fs.existsSync(song.filePath)) {
                deleteStmt.run(song.filePath)
                removed++
            }
        }

        if (removed > 0) {
            // Update all playlists' timestamps
            database.prepare('UPDATE playlists SET updatedAt = ?').run(Date.now())
        }

        return removed
    } catch (error) {
        console.error('Error cleaning up missing songs:', error)
        return 0
    }
}
