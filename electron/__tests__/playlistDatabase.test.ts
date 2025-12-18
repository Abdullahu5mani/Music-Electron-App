/**
 * Playlist Database Tests
 * Tests for SQLite wrapper module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as playlistDb from '../playlistDatabase'
import fs from 'fs'

// Mock fs
vi.mock('fs', () => ({
    default: {
        existsSync: vi.fn(),
        mkdirSync: vi.fn(),
    },
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
}))

// Mock electron
vi.mock('electron', () => ({
    app: {
        getPath: vi.fn().mockReturnValue('/mock/userData'),
    },
}))

// Mock better-sqlite3
const { mockDatabase, mockStatement } = vi.hoisted(() => {
    const statement = {
        run: vi.fn(),
        all: vi.fn(),
        get: vi.fn(),
    }
    const db = {
        exec: vi.fn(),
        prepare: vi.fn(),
        transaction: vi.fn((fn) => fn),
        close: vi.fn(),
    }
    return { mockDatabase: db, mockStatement: statement }
})

vi.mock('better-sqlite3', () => ({
    default: vi.fn(function () { return mockDatabase })
}))

describe('playlistDatabase', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        // Reset default mock implementations/values
        mockDatabase.prepare.mockReturnValue(mockStatement)
        mockStatement.run.mockReturnValue({ lastInsertRowid: 1, changes: 1 })
        mockStatement.all.mockReturnValue([])
        mockStatement.get.mockReturnValue(undefined)
    })

    afterEach(() => {
        playlistDb.closePlaylistDatabase()
    })

    describe('initializePlaylistDatabase', () => {
        it('should create database and tables', () => {
            vi.mocked(fs.existsSync).mockReturnValue(false)

            playlistDb.initializePlaylistDatabase()

            expect(fs.mkdirSync).toHaveBeenCalled()
            expect(mockDatabase.exec).toHaveBeenCalledTimes(4) // 2 tables + 2 indexes
        })

        it('should return existing instance', () => {
            const db1 = playlistDb.initializePlaylistDatabase()
            const db2 = playlistDb.initializePlaylistDatabase()

            expect(db1).toBe(db2)
            expect(mockDatabase.exec).toHaveBeenCalledTimes(4) // Only init once
        })
    })

    describe('createPlaylist', () => {
        it('should insert playlist and return object', () => {
            const result = playlistDb.createPlaylist('My List', 'Desc')

            expect(result).not.toBeNull()
            expect(result?.name).toBe('My List')
            expect(result?.description).toBe('Desc')
            expect(mockStatement.run).toHaveBeenCalled()
        })
    })

    describe('deletePlaylist', () => {
        it('should delete songs then playlist', () => {
            playlistDb.deletePlaylist(1)

            // prepare should be called twice (songs delete, playlist delete)
            expect(mockDatabase.prepare).toHaveBeenCalledTimes(2)
            expect(mockStatement.run).toHaveBeenCalledWith(1)
        })
    })

    describe('addSongsToPlaylist', () => {
        it('should add new songs and ignore existing ones', () => {
            // Mock empty existing songs
            mockStatement.get.mockReturnValue(undefined)
            // Mock max position
            mockStatement.get.mockReturnValueOnce(undefined) // check existing 1
            mockStatement.get.mockReturnValueOnce(undefined) // check existing 2
            mockStatement.get.mockReturnValueOnce({ maxPos: 5 }) // get max pos

            const result = playlistDb.addSongsToPlaylist(1, ['/song1.mp3', '/song2.mp3'])

            expect(result.added).toBe(2)
            expect(result.alreadyInPlaylist).toBe(0)
            // Should verify transaction usage
            expect(mockDatabase.transaction).toHaveBeenCalled()
        })

        it('should skip duplicate songs', () => {
            // Mock one existing
            mockStatement.get.mockReturnValueOnce({ filePath: '/song1.mp3' })

            const result = playlistDb.addSongsToPlaylist(1, ['/song1.mp3'])

            expect(result.added).toBe(0)
            expect(result.alreadyInPlaylist).toBe(1)
        })
    })

    describe('getAllPlaylists', () => {
        it('should return mapped playlists', () => {
            mockStatement.all.mockReturnValue([{
                id: 1,
                name: 'Test',
                songCount: 5
            }])

            const results = playlistDb.getAllPlaylists()

            expect(results).toHaveLength(1)
            expect(results[0].totalDuration).toBe(0)
            expect(results[0].songCount).toBe(5)
        })
    })
})
