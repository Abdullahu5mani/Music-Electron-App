/**
 * Lyrics Cache Module
 * 
 * Stores generated lyrics data to avoid re-processing the same songs.
 * Uses a simple JSON file for storage.
 */

import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'

export interface LyricsSegment {
    start: number
    end: number
    text: string
}

export interface CachedLyrics {
    filePath: string
    fileHash: string
    cachedAt: number
    lyrics: string
    segments: LyricsSegment[]
}

interface LyricsCacheData {
    version: number
    entries: Record<string, CachedLyrics>
}

const CACHE_VERSION = 1
let cacheData: LyricsCacheData | null = null

/**
 * Get the cache file path
 */
function getCachePath(): string {
    const userDataPath = app.getPath('userData')
    return path.join(userDataPath, 'lyrics-cache.json')
}

/**
 * Generate a hash for a file based on path + size + modification time
 */
function generateFileHash(filePath: string): string | null {
    try {
        const stats = fs.statSync(filePath)
        const hashInput = `${filePath}:${stats.size}:${stats.mtimeMs}`
        return crypto.createHash('sha256').update(hashInput).digest('hex').substring(0, 16)
    } catch (error) {
        console.error('[LyricsCache] Error generating file hash:', error)
        return null
    }
}

/**
 * Load the cache from disk
 */
function loadCache(): LyricsCacheData {
    if (cacheData) return cacheData

    const cachePath = getCachePath()

    try {
        if (fs.existsSync(cachePath)) {
            const content = fs.readFileSync(cachePath, 'utf-8')
            const data = JSON.parse(content) as LyricsCacheData

            // Check version
            if (data.version === CACHE_VERSION) {
                cacheData = data
                console.log('[LyricsCache] Loaded', Object.keys(data.entries).length, 'cached entries')
                return cacheData
            }
        }
    } catch (error) {
        console.error('[LyricsCache] Error loading cache:', error)
    }

    // Initialize empty cache
    cacheData = { version: CACHE_VERSION, entries: {} }
    return cacheData
}

/**
 * Save the cache to disk
 */
function saveCache(): void {
    if (!cacheData) return

    const cachePath = getCachePath()

    try {
        const dir = path.dirname(cachePath)
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true })
        }

        fs.writeFileSync(cachePath, JSON.stringify(cacheData, null, 2))
        console.log('[LyricsCache] Saved cache with', Object.keys(cacheData.entries).length, 'entries')
    } catch (error) {
        console.error('[LyricsCache] Error saving cache:', error)
    }
}

/**
 * Get cached lyrics for a file (if available and file hasn't changed)
 */
export function getCachedLyrics(filePath: string): CachedLyrics | null {
    const cache = loadCache()

    const currentHash = generateFileHash(filePath)
    if (!currentHash) return null

    // Use path as key
    const entry = cache.entries[filePath]
    if (!entry) return null

    // Check if file has changed
    if (entry.fileHash !== currentHash) {
        console.log('[LyricsCache] File changed, cache invalidated:', path.basename(filePath))
        delete cache.entries[filePath]
        saveCache()
        return null
    }

    console.log('[LyricsCache] Cache hit for:', path.basename(filePath))
    return entry
}

/**
 * Store lyrics in the cache
 */
export function cacheLyrics(
    filePath: string,
    lyrics: string,
    segments: LyricsSegment[]
): boolean {
    const cache = loadCache()

    const fileHash = generateFileHash(filePath)
    if (!fileHash) return false

    cache.entries[filePath] = {
        filePath,
        fileHash,
        cachedAt: Date.now(),
        lyrics,
        segments
    }

    saveCache()
    console.log('[LyricsCache] Cached lyrics for:', path.basename(filePath))
    return true
}

/**
 * Remove cached lyrics for a file
 */
export function removeCachedLyrics(filePath: string): boolean {
    const cache = loadCache()

    if (cache.entries[filePath]) {
        delete cache.entries[filePath]
        saveCache()
        return true
    }

    return false
}

/**
 * Clear all cached lyrics
 */
export function clearLyricsCache(): void {
    cacheData = { version: CACHE_VERSION, entries: {} }
    saveCache()
    console.log('[LyricsCache] Cache cleared')
}

/**
 * Get cache statistics
 */
export function getLyricsCacheStats(): { totalEntries: number; totalSizeBytes: number } {
    const cache = loadCache()
    const cachePath = getCachePath()

    let sizeBytes = 0
    try {
        if (fs.existsSync(cachePath)) {
            sizeBytes = fs.statSync(cachePath).size
        }
    } catch { }

    return {
        totalEntries: Object.keys(cache.entries).length,
        totalSizeBytes: sizeBytes
    }
}
