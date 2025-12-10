import { ipcMain } from 'electron'
import {
  getFileScanStatus,
  markFileScanned,
  getBatchScanStatus,
  getUnscannedFiles,
  getScanStatistics,
  cleanupOrphanedEntries,
  getCachedEntry,
  clearCache,
  getUsedAssetPaths,
  type ScanStatusType,
  type FileScanStatus
} from '../../metadataCache'

/**
 * Registers IPC handlers for metadata cache operations
 * 
 * These handlers allow the Renderer process to:
 * - Check if files have been scanned
 * - Mark files as scanned after fingerprinting
 * - Get batch scan status for multiple files
 * - Get statistics about scanned files
 */
export function registerCacheHandlers() {
  // Get scan status for a single file
  ipcMain.handle('cache-get-file-status', async (_event, filePath: string): Promise<ScanStatusType> => {
    try {
      return getFileScanStatus(filePath)
    } catch (error) {
      console.error('Error getting file scan status:', error)
      return 'unscanned'
    }
  })

  // Mark a file as scanned
  ipcMain.handle('cache-mark-file-scanned', async (
    _event,
    filePath: string,
    mbid: string | null,
    hasMetadata: boolean,
    assetPath: string | null = null
  ): Promise<boolean> => {
    try {
      return markFileScanned(filePath, mbid, hasMetadata, assetPath)
    } catch (error) {
      console.error('Error marking file as scanned:', error)
      return false
    }
  })

  // Get scan status for multiple files (batch operation)
  ipcMain.handle('cache-get-batch-status', async (
    _event,
    filePaths: string[]
  ): Promise<Record<string, ScanStatusType>> => {
    try {
      const statusMap = getBatchScanStatus(filePaths)
      // Convert Map to plain object for IPC serialization
      const result: Record<string, ScanStatusType> = {}
      for (const [path, status] of statusMap) {
        result[path] = status
      }
      return result
    } catch (error) {
      console.error('Error getting batch scan status:', error)
      return {}
    }
  })

  // Get list of unscanned files from a list
  ipcMain.handle('cache-get-unscanned-files', async (
    _event,
    filePaths: string[]
  ): Promise<string[]> => {
    try {
      return getUnscannedFiles(filePaths)
    } catch (error) {
      console.error('Error getting unscanned files:', error)
      return filePaths // Return all files as unscanned on error
    }
  })

  // Get scan statistics
  ipcMain.handle('cache-get-statistics', async (): Promise<{
    total: number
    withMetadata: number
    withoutMetadata: number
  }> => {
    try {
      return getScanStatistics()
    } catch (error) {
      console.error('Error getting scan statistics:', error)
      return { total: 0, withMetadata: 0, withoutMetadata: 0 }
    }
  })

  // Get cached entry for a file
  ipcMain.handle('cache-get-entry', async (
    _event,
    filePath: string
  ): Promise<FileScanStatus | null> => {
    try {
      return getCachedEntry(filePath)
    } catch (error) {
      console.error('Error getting cached entry:', error)
      return null
    }
  })

  // Cleanup orphaned entries (files that no longer exist)
  ipcMain.handle('cache-cleanup-orphaned', async (): Promise<number> => {
    try {
      return cleanupOrphanedEntries()
    } catch (error) {
      console.error('Error cleaning up orphaned entries:', error)
      return 0
    }
  })

  // Clear the entire cache (for debugging/reset)
  ipcMain.handle('cache-clear', async (): Promise<boolean> => {
    try {
      clearCache()
      return true
    } catch (error) {
      console.error('Error clearing cache:', error)
      return false
    }
  })

  // Get used assets (mostly for testing/verification)
  ipcMain.handle('cache-get-used-assets', async (): Promise<string[]> => {
    try {
      const usedAssets = getUsedAssetPaths()
      return Array.from(usedAssets)
    } catch (error) {
      console.error('Error getting used assets:', error)
      return []
    }
  })
}
