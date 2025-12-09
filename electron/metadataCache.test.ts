import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Database from 'better-sqlite3'
import * as fs from 'fs'
import * as path from 'path'
import {
  initializeDatabase,
  closeDatabase,
  generateFileHash,
  getFileScanStatus,
  markFileScanned,
  getBatchScanStatus,
  getUnscannedFiles,
  getScanStatistics,
  cleanupOrphanedEntries,
  clearCache,
  getCachedEntry,
} from './metadataCache'

// Use a test database in a temp directory
const TEST_DB_DIR = path.join(__dirname, '../test-temp')
const TEST_DB_PATH = path.join(TEST_DB_DIR, 'test-metadata-cache.db')

// Mock Electron app.getPath
vi.mock('electron', async () => {
  const actual = await vi.importActual('electron')
  return {
    ...actual,
    app: {
      getPath: () => TEST_DB_DIR,
    },
  }
})

describe('metadataCache', () => {
  let testDb: Database.Database | null = null

  beforeEach(() => {
    // Clean up any existing test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH)
    }
    if (fs.existsSync(TEST_DB_DIR)) {
      fs.rmSync(TEST_DB_DIR, { recursive: true, force: true })
    }
    fs.mkdirSync(TEST_DB_DIR, { recursive: true })

    // Initialize test database
    testDb = initializeDatabase()
  })

  afterEach(() => {
    closeDatabase()
    // Clean up test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH)
    }
    if (fs.existsSync(TEST_DB_DIR)) {
      fs.rmSync(TEST_DB_DIR, { recursive: true, force: true })
    }
  })

  describe('generateFileHash', () => {
    it('should generate a hash for an existing file', () => {
      // Create a test file
      const testFile = path.join(TEST_DB_DIR, 'test.mp3')
      fs.writeFileSync(testFile, 'test content')

      const hash = generateFileHash(testFile)
      expect(hash).toBeTruthy()
      expect(typeof hash).toBe('string')
      expect(hash.length).toBe(64) // SHA256 hex string length
    })

    it('should return null for non-existent file', () => {
      const hash = generateFileHash('/nonexistent/file.mp3')
      expect(hash).toBeNull()
    })

    it('should generate different hashes for different files', () => {
      const file1 = path.join(TEST_DB_DIR, 'file1.mp3')
      const file2 = path.join(TEST_DB_DIR, 'file2.mp3')
      fs.writeFileSync(file1, 'content1')
      fs.writeFileSync(file2, 'content2')

      const hash1 = generateFileHash(file1)
      const hash2 = generateFileHash(file2)

      expect(hash1).not.toBe(hash2)
    })

    it('should generate different hash when file is modified', () => {
      const testFile = path.join(TEST_DB_DIR, 'test.mp3')
      fs.writeFileSync(testFile, 'original content')

      const hash1 = generateFileHash(testFile)

      // Modify file
      fs.writeFileSync(testFile, 'modified content')

      const hash2 = generateFileHash(testFile)

      expect(hash1).not.toBe(hash2)
    })
  })

  describe('getFileScanStatus', () => {
    it('should return unscanned for new file', () => {
      const testFile = path.join(TEST_DB_DIR, 'new-file.mp3')
      fs.writeFileSync(testFile, 'content')

      const status = getFileScanStatus(testFile)
      expect(status).toBe('unscanned')
    })

    it('should return file-changed when file hash differs', () => {
      const testFile = path.join(TEST_DB_DIR, 'file.mp3')
      fs.writeFileSync(testFile, 'original')

      // Mark as scanned
      markFileScanned(testFile, 'mbid-123', true)

      // Modify file
      fs.writeFileSync(testFile, 'modified')

      const status = getFileScanStatus(testFile)
      expect(status).toBe('file-changed')
    })
  })

  describe('markFileScanned', () => {
    it('should mark file as scanned with metadata', () => {
      const testFile = path.join(TEST_DB_DIR, 'file.mp3')
      fs.writeFileSync(testFile, 'content')

      const result = markFileScanned(testFile, 'mbid-123', true)
      expect(result).toBe(true)

      const status = getFileScanStatus(testFile)
      expect(status).toBe('scanned-tagged')
    })

    it('should mark file as scanned without metadata', () => {
      const testFile = path.join(TEST_DB_DIR, 'file.mp3')
      fs.writeFileSync(testFile, 'content')

      markFileScanned(testFile, null, false)

      const status = getFileScanStatus(testFile)
      expect(status).toBe('scanned-no-match')
    })

    it('should return false for non-existent file', () => {
      const result = markFileScanned('/nonexistent/file.mp3', 'mbid-123', true)
      expect(result).toBe(false)
    })
  })

  describe('getBatchScanStatus', () => {
    it('should return statuses for multiple files', () => {
      const file1 = path.join(TEST_DB_DIR, 'file1.mp3')
      const file2 = path.join(TEST_DB_DIR, 'file2.mp3')
      fs.writeFileSync(file1, 'content1')
      fs.writeFileSync(file2, 'content2')

      markFileScanned(file1, 'mbid-1', true)

      const statuses = getBatchScanStatus([file1, file2])
      expect(statuses.get(file1)).toBe('scanned-tagged')
      expect(statuses.get(file2)).toBe('unscanned')
    })
  })

  describe('getUnscannedFiles', () => {
    it('should filter to unscanned files', () => {
      const file1 = path.join(TEST_DB_DIR, 'file1.mp3')
      const file2 = path.join(TEST_DB_DIR, 'file2.mp3')
      const file3 = path.join(TEST_DB_DIR, 'file3.mp3')
      fs.writeFileSync(file1, 'content1')
      fs.writeFileSync(file2, 'content2')
      fs.writeFileSync(file3, 'content3')

      markFileScanned(file2, 'mbid-2', true)

      const unscanned = getUnscannedFiles([file1, file2, file3])
      expect(unscanned).toContain(file1)
      expect(unscanned).not.toContain(file2)
      expect(unscanned).toContain(file3)
    })
  })

  describe('getScanStatistics', () => {
    it('should return correct statistics', () => {
      const file1 = path.join(TEST_DB_DIR, 'file1.mp3')
      const file2 = path.join(TEST_DB_DIR, 'file2.mp3')
      fs.writeFileSync(file1, 'content1')
      fs.writeFileSync(file2, 'content2')

      markFileScanned(file1, 'mbid-1', true)
      markFileScanned(file2, null, false)

      const stats = getScanStatistics()
      expect(stats.total).toBe(2)
      expect(stats.withMetadata).toBe(1)
      expect(stats.withoutMetadata).toBe(1)
    })
  })

  describe('cleanupOrphanedEntries', () => {
    it('should remove entries for deleted files', () => {
      const file1 = path.join(TEST_DB_DIR, 'file1.mp3')
      const file2 = path.join(TEST_DB_DIR, 'file2.mp3')
      fs.writeFileSync(file1, 'content1')
      fs.writeFileSync(file2, 'content2')

      markFileScanned(file1, 'mbid-1', true)
      markFileScanned(file2, 'mbid-2', true)

      // Delete file1
      fs.unlinkSync(file1)

      const removed = cleanupOrphanedEntries()
      expect(removed).toBe(1)

      const status = getFileScanStatus(file2)
      expect(status).toBe('scanned-tagged')
    })
  })

  describe('getCachedEntry', () => {
    it('should return cached entry for scanned file', () => {
      const testFile = path.join(TEST_DB_DIR, 'file.mp3')
      fs.writeFileSync(testFile, 'content')

      markFileScanned(testFile, 'mbid-123', true)

      const entry = getCachedEntry(testFile)
      expect(entry).toBeTruthy()
      expect(entry?.filePath).toBe(testFile)
      expect(entry?.mbid).toBe('mbid-123')
      expect(entry?.hasMetadata).toBe(true)
    })

    it('should return null for unscanned file', () => {
      const testFile = path.join(TEST_DB_DIR, 'file.mp3')
      fs.writeFileSync(testFile, 'content')

      const entry = getCachedEntry(testFile)
      expect(entry).toBeNull()
    })
  })

  describe('clearCache', () => {
    it('should clear all entries', () => {
      const file1 = path.join(TEST_DB_DIR, 'file1.mp3')
      const file2 = path.join(TEST_DB_DIR, 'file2.mp3')
      fs.writeFileSync(file1, 'content1')
      fs.writeFileSync(file2, 'content2')

      markFileScanned(file1, 'mbid-1', true)
      markFileScanned(file2, 'mbid-2', true)

      clearCache()

      const stats = getScanStatistics()
      expect(stats.total).toBe(0)
    })
  })
})

