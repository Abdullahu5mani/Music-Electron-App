import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'

/**
 * Metadata Cache Module
 * 
 * Uses SQLite to track which files have been scanned/fingerprinted.
 * This prevents re-scanning files that have already been processed.
 * 
 * Key features:
 * - Tracks file scan status using a hash of (path + size + mtime)
 * - Detects file changes automatically (modified files get rescanned)
 * - Stores MusicBrainz ID for successfully matched files
 * - Persists across app restarts
 */

export interface FileScanStatus {
  filePath: string
  fileHash: string
  scannedAt: number
  mbid: string | null
  hasMetadata: boolean
}

export type ScanStatusType = 'unscanned' | 'scanned-tagged' | 'scanned-no-match' | 'file-changed'

let db: Database.Database | null = null

/**
 * Get the database file path in user data directory
 */
function getDatabasePath(): string {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, 'metadata-cache.db')
}

/**
 * Initialize the database connection and create tables if needed
 */
export function initializeDatabase(): Database.Database {
  if (db) return db

  const dbPath = getDatabasePath()
  console.log('Initializing metadata cache database at:', dbPath)

  // Ensure the directory exists
  const dir = path.dirname(dbPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  db = new Database(dbPath)

  // Create the metadata cache table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS metadata_cache (
      filePath TEXT PRIMARY KEY,
      fileHash TEXT NOT NULL,
      scannedAt INTEGER NOT NULL,
      mbid TEXT,
      hasMetadata INTEGER NOT NULL DEFAULT 0
    )
  `)

  // Create index for faster lookups
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_file_hash ON metadata_cache(fileHash)
  `)

  console.log('Metadata cache database initialized successfully')
  return db
}

/**
 * Close the database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
    console.log('Metadata cache database closed')
  }
}

/**
 * Generate a hash for a file based on path + size + modification time
 * This allows us to detect when a file has been modified
 */
export function generateFileHash(filePath: string): string | null {
  try {
    const stats = fs.statSync(filePath)
    const hashInput = `${filePath}:${stats.size}:${stats.mtimeMs}`
    return crypto.createHash('sha256').update(hashInput).digest('hex')
  } catch (error) {
    console.error('Error generating file hash:', error)
    return null
  }
}

/**
 * Check if a file has been scanned and get its status
 */
export function getFileScanStatus(filePath: string): ScanStatusType {
  const database = initializeDatabase()

  const currentHash = generateFileHash(filePath)
  if (!currentHash) {
    return 'unscanned' // File doesn't exist or can't be read
  }

  const row = database.prepare(`
    SELECT fileHash, hasMetadata FROM metadata_cache WHERE filePath = ?
  `).get(filePath) as { fileHash: string; hasMetadata: number } | undefined

  if (!row) {
    return 'unscanned' // Not in database
  }

  if (row.fileHash !== currentHash) {
    return 'file-changed' // File has been modified since last scan
  }

  if (row.hasMetadata) {
    return 'scanned-tagged' // Scanned and metadata was written
  }

  return 'scanned-no-match' // Scanned but no match found
}

/**
 * Check if a file is already scanned (regardless of whether metadata was found)
 * Returns true if scanned and unchanged, false otherwise
 */
export function isFileScanned(filePath: string): boolean {
  const status = getFileScanStatus(filePath)
  return status === 'scanned-tagged' || status === 'scanned-no-match'
}

/**
 * Mark a file as scanned
 * @param filePath - Path to the music file
 * @param mbid - MusicBrainz ID if found (null if no match)
 * @param hasMetadata - Whether metadata was successfully written to the file
 */
export function markFileScanned(
  filePath: string,
  mbid: string | null,
  hasMetadata: boolean
): boolean {
  const database = initializeDatabase()

  const fileHash = generateFileHash(filePath)
  if (!fileHash) {
    console.error('Failed to generate hash for file:', filePath)
    return false
  }

  try {
    const stmt = database.prepare(`
      INSERT OR REPLACE INTO metadata_cache (filePath, fileHash, scannedAt, mbid, hasMetadata)
      VALUES (?, ?, ?, ?, ?)
    `)

    stmt.run(filePath, fileHash, Date.now(), mbid, hasMetadata ? 1 : 0)
    console.log(`Marked file as scanned: ${filePath} (hasMetadata: ${hasMetadata})`)
    return true
  } catch (error) {
    console.error('Error marking file as scanned:', error)
    return false
  }
}

/**
 * Get all file scan statuses for a list of file paths
 * Returns a map of filePath -> ScanStatusType
 */
export function getBatchScanStatus(filePaths: string[]): Map<string, ScanStatusType> {
  const results = new Map<string, ScanStatusType>()

  for (const filePath of filePaths) {
    results.set(filePath, getFileScanStatus(filePath))
  }

  return results
}

/**
 * Get unscanned files from a list
 */
export function getUnscannedFiles(filePaths: string[]): string[] {
  return filePaths.filter(filePath => {
    const status = getFileScanStatus(filePath)
    return status === 'unscanned' || status === 'file-changed'
  })
}

/**
 * Get scan statistics
 */
export function getScanStatistics(): {
  total: number
  withMetadata: number
  withoutMetadata: number
} {
  const database = initializeDatabase()

  const row = database.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN hasMetadata = 1 THEN 1 ELSE 0 END) as withMetadata
    FROM metadata_cache
  `).get() as { total: number; withMetadata: number }

  return {
    total: row.total,
    withMetadata: row.withMetadata,
    withoutMetadata: row.total - row.withMetadata
  }
}

/**
 * Remove entries for files that no longer exist
 */
export function cleanupOrphanedEntries(): number {
  const database = initializeDatabase()

  const rows = database.prepare('SELECT filePath FROM metadata_cache').all() as { filePath: string }[]
  let removed = 0

  const deleteStmt = database.prepare('DELETE FROM metadata_cache WHERE filePath = ?')

  for (const row of rows) {
    if (!fs.existsSync(row.filePath)) {
      deleteStmt.run(row.filePath)
      removed++
    }
  }

  if (removed > 0) {
    console.log(`Cleaned up ${removed} orphaned entries from metadata cache`)
  }

  return removed
}

/**
 * Get the cached entry for a file (if exists)
 */
export function getCachedEntry(filePath: string): FileScanStatus | null {
  const database = initializeDatabase()

  const row = database.prepare(`
    SELECT filePath, fileHash, scannedAt, mbid, hasMetadata 
    FROM metadata_cache 
    WHERE filePath = ?
  `).get(filePath) as {
    filePath: string
    fileHash: string
    scannedAt: number
    mbid: string | null
    hasMetadata: number
  } | undefined

  if (!row) return null

  return {
    filePath: row.filePath,
    fileHash: row.fileHash,
    scannedAt: row.scannedAt,
    mbid: row.mbid,
    hasMetadata: row.hasMetadata === 1
  }
}

/**
 * Clear the entire cache (for debugging/reset purposes)
 */
export function clearCache(): void {
  const database = initializeDatabase()
  database.exec('DELETE FROM metadata_cache')
  console.log('Metadata cache cleared')
}

