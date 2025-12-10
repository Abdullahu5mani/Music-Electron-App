import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ipcMain } from 'electron'
import fs from 'fs'
import fsPromises from 'fs/promises'
import path from 'path'
import { registerApiHandlers } from '../apiHandlers'
import { registerCacheHandlers } from '../cacheHandlers'
import * as metadataCache from '../../../metadataCache'

// Mock dependencies
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn().mockReturnValue('/mock/user/data'),
  },
  ipcMain: {
    handle: vi.fn(),
  },
}))

vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
    readdirSync: vi.fn(),
    statSync: vi.fn(),
    unlinkSync: vi.fn(),
    writeFileSync: vi.fn(),
  },
}))

vi.mock('fs/promises', () => ({
  default: {
    stat: vi.fn(),
    readdir: vi.fn(),
    unlink: vi.fn(),
  },
}))

vi.mock('path', () => ({
  default: {
    join: (...args: string[]) => args.join('/'),
    basename: (p: string) => p.split('/').pop() || '',
    dirname: (p: string) => p.split('/').slice(0, -1).join('/'),
  }
}))

// Mock metadataCache
vi.mock('../../../metadataCache', () => ({
  getUsedAssetPaths: vi.fn(),
  getFileScanStatus: vi.fn(),
  markFileScanned: vi.fn(),
  getBatchScanStatus: vi.fn(),
  getUnscannedFiles: vi.fn(),
  getScanStatistics: vi.fn(),
  cleanupOrphanedEntries: vi.fn(),
  getCachedEntry: vi.fn(),
  clearCache: vi.fn(),
}))

describe('Asset Garbage Collection', () => {
  let runAssetGCHandler: () => Promise<{ deleted: number, errors: number }>

  beforeEach(() => {
    vi.resetAllMocks()

    // Register handlers to capture the GC handler
    registerApiHandlers()

    // Find the 'run-asset-gc' handler
    const calls = (ipcMain.handle as any).mock.calls
    const gcCall = calls.find((call: any[]) => call[0] === 'run-asset-gc')
    if (gcCall) {
      runAssetGCHandler = gcCall[1]
    }
  })

  it('should be registered as an IPC handler', () => {
    expect(ipcMain.handle).toHaveBeenCalledWith('run-asset-gc', expect.any(Function))
  })

  it('should delete unreferenced assets', async () => {
    // Setup
    // 1. Mock assets dir exists (stat resolves)
    vi.mocked(fsPromises.stat).mockResolvedValue({} as any)

    // 2. Mock files in assets dir
    const mockFiles = ['used_image.jpg', 'unused_image.jpg', 'another_unused.png']
    vi.mocked(fsPromises.readdir).mockResolvedValue(mockFiles as any)

    // 3. Mock used assets in DB
    const mockUsedAssets = new Set(['assets/used_image.jpg'])
    vi.mocked(metadataCache.getUsedAssetPaths).mockReturnValue(mockUsedAssets)

    // Execute
    const result = await runAssetGCHandler()

    // Verify
    expect(result.deleted).toBe(2)
    expect(result.errors).toBe(0)

    // Should verify unlink was called for unused files
    expect(fsPromises.unlink).toHaveBeenCalledWith('/mock/user/data/assets/unused_image.jpg')
    expect(fsPromises.unlink).toHaveBeenCalledWith('/mock/user/data/assets/another_unused.png')

    // Should NOT have called unlink for used file
    expect(fsPromises.unlink).not.toHaveBeenCalledWith('/mock/user/data/assets/used_image.jpg')
  })

  it('should handle mock deleted album scenario', async () => {
    // Scenario: Album deleted means its reference is removed from DB.
    // So getUsedAssetPaths will NOT return the image associated with that album.

    // 1. Mock assets dir exists
    vi.mocked(fsPromises.stat).mockResolvedValue({} as any)

    // 2. Mock files in assets dir (contains the image of the deleted album)
    const mockFiles = ['deleted_album_cover.jpg', 'existing_album_cover.jpg']
    vi.mocked(fsPromises.readdir).mockResolvedValue(mockFiles as any)

    // 3. Mock used assets in DB (simulate that deleted_album_cover is no longer returned)
    const mockUsedAssets = new Set(['assets/existing_album_cover.jpg'])
    vi.mocked(metadataCache.getUsedAssetPaths).mockReturnValue(mockUsedAssets)

    // Execute
    const result = await runAssetGCHandler()

    // Verify
    expect(result.deleted).toBe(1)
    expect(fsPromises.unlink).toHaveBeenCalledWith('/mock/user/data/assets/deleted_album_cover.jpg')
    expect(fsPromises.unlink).not.toHaveBeenCalledWith('/mock/user/data/assets/existing_album_cover.jpg')
  })

  it('should handle absolute paths in database gracefully', async () => {
    // Scenario: DB has absolute path, but we only compare filenames

    vi.mocked(fsPromises.stat).mockResolvedValue({} as any)
    vi.mocked(fsPromises.readdir).mockResolvedValue(['image1.jpg', 'image2.jpg'] as any)

    // DB returns absolute path for image1
    const mockUsedAssets = new Set(['/some/absolute/path/to/assets/image1.jpg'])
    vi.mocked(metadataCache.getUsedAssetPaths).mockReturnValue(mockUsedAssets)

    const result = await runAssetGCHandler()

    // image1 should be kept (matched by filename), image2 should be deleted
    expect(result.deleted).toBe(1)
    expect(fsPromises.unlink).toHaveBeenCalledWith('/mock/user/data/assets/image2.jpg')
    expect(fsPromises.unlink).not.toHaveBeenCalledWith('/mock/user/data/assets/image1.jpg')
  })

  it('should handle errors gracefully', async () => {
    vi.mocked(fsPromises.stat).mockResolvedValue({} as any)
    vi.mocked(fsPromises.readdir).mockResolvedValue(['error_file.jpg'] as any)
    vi.mocked(metadataCache.getUsedAssetPaths).mockReturnValue(new Set())

    // Mock unlink throwing error
    vi.mocked(fsPromises.unlink).mockImplementation(() => {
      throw new Error('Permission denied')
    })

    const result = await runAssetGCHandler()

    expect(result.deleted).toBe(0)
    expect(result.errors).toBe(1)
  })
})
