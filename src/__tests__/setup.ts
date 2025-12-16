/**
 * Test setup file for Vitest
 * This file runs before all tests
 */

import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers)

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock window.electronAPI for renderer tests
global.window.electronAPI = {
  scanMusicFolder: vi.fn(),
  selectMusicFolder: vi.fn(),
  readFileBuffer: vi.fn(),
  readSingleFileMetadata: vi.fn(),
  writeCoverArt: vi.fn(),
  writeMetadata: vi.fn(),
  lookupAcoustid: vi.fn(),
  lookupMusicBrainz: vi.fn(),
  downloadImage: vi.fn(),
  downloadImageWithFallback: vi.fn(),
  downloadYouTube: vi.fn(),
  getBinaryStatuses: vi.fn(),
  minimizeWindow: vi.fn(),
  maximizeWindow: vi.fn(),
  closeWindow: vi.fn(),
  sendPlaybackState: vi.fn(),
  sendWindowVisibility: vi.fn(),
  getSettings: vi.fn().mockResolvedValue({ musicFolderPath: null, downloadFolderPath: null, scanSubfolders: true }),
  saveSettings: vi.fn(),
  selectDownloadFolder: vi.fn(),
  getPlatformInfo: vi.fn(),
  cacheGetFileStatus: vi.fn(),
  cacheMarkFileScanned: vi.fn(),
  cacheGetBatchStatus: vi.fn(),
  cacheGetUnscannedFiles: vi.fn(),
  cacheGetStatistics: vi.fn(),
  cacheGetEntry: vi.fn(),
  cacheCleanupOrphaned: vi.fn(),
  cacheClear: vi.fn(),
  onDownloadProgress: vi.fn(() => () => { }),
  onDownloadTitle: vi.fn(() => () => { }),
  onBinaryDownloadProgress: vi.fn(() => () => { }),
  onWindowStateChanged: vi.fn(() => () => { }),
  onTrayPlayPause: vi.fn(() => () => { }),
} as any

