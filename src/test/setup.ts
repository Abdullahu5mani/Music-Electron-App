/**
 * Test setup file for Vitest
 * This file runs before all tests
 */

/// <reference types="@testing-library/jest-dom" />

import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers)

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock scrollIntoView which is not implemented in jsdom
Element.prototype.scrollIntoView = vi.fn()

// Mock window.electronAPI for renderer tests
global.window.electronAPI = {
  scanMusicFolder: vi.fn(),
  selectMusicFolder: vi.fn(),
  readFileBuffer: vi.fn(),
  readSingleFileMetadata: vi.fn(),
  writeCoverArt: vi.fn(),
  writeMetadata: vi.fn().mockResolvedValue({ success: true }),
  lookupAcoustid: vi.fn(),
  lookupMusicBrainz: vi.fn(),
  downloadImage: vi.fn(),
  downloadImageWithFallback: vi.fn().mockResolvedValue({ success: true }),
  downloadYouTube: vi.fn(),
  getBinaryStatuses: vi.fn().mockResolvedValue([]),
  installYtdlp: vi.fn().mockResolvedValue({ success: true }),
  installFpcalc: vi.fn().mockResolvedValue({ success: true }),
  installWhisper: vi.fn().mockResolvedValue({ success: true }),
  getWhisperModels: vi.fn().mockResolvedValue([]),
  getSelectedWhisperModel: vi.fn().mockResolvedValue({ id: 'tiny', name: 'Tiny' }),
  setWhisperModel: vi.fn().mockResolvedValue({ success: true }),
  processLyrics: vi.fn().mockResolvedValue({ success: true, message: 'Processed', lyrics: 'Test lyrics' }),
  minimizeWindow: vi.fn(),
  maximizeWindow: vi.fn(),
  closeWindow: vi.fn(),
  sendPlaybackState: vi.fn(),
  sendWindowVisibility: vi.fn(),
  getSettings: vi.fn().mockResolvedValue({ musicFolderPath: null, downloadFolderPath: null, scanSubfolders: true }),
  saveSettings: vi.fn(),
  selectDownloadFolder: vi.fn(),
  getPlatformInfo: vi.fn().mockResolvedValue({ platform: 'win32', arch: 'x64' }),
  // Cache mocks
  cacheGetFileStatus: vi.fn(),
  cacheMarkFileScanned: vi.fn().mockResolvedValue(undefined),
  cacheGetBatchStatus: vi.fn(),
  cacheGetUnscannedFiles: vi.fn(),
  cacheGetStatistics: vi.fn(),
  cacheGetEntry: vi.fn(),
  cacheCleanupOrphaned: vi.fn(),
  cacheClear: vi.fn(),
  // Event listener mocks
  onDownloadProgress: vi.fn(() => () => { }),
  onDownloadTitle: vi.fn(() => () => { }),
  onBinaryDownloadProgress: vi.fn(() => () => { }),
  onBinaryInstallProgress: vi.fn(() => () => { }),
  onWindowStateChanged: vi.fn(() => () => { }),
  onTrayPlayPause: vi.fn(() => () => { }),
  onLyricsProgress: vi.fn(() => () => { }),
  // File watcher mocks
  fileWatcherStart: vi.fn().mockResolvedValue({ success: true }),
  fileWatcherStop: vi.fn().mockResolvedValue({ success: true }),
  fileWatcherStatus: vi.fn().mockResolvedValue({ isWatching: false, watchPath: null }),
  fileWatcherIgnore: vi.fn().mockResolvedValue({ success: true }),
  onFileWatcherEvent: vi.fn(() => () => { }),
  // Playlist mocks
  playlistGetAll: vi.fn().mockResolvedValue({ success: true, playlists: [] }),
  playlistCreate: vi.fn().mockResolvedValue({ success: true, playlist: null }),
  playlistDelete: vi.fn().mockResolvedValue({ success: true }),
  playlistRename: vi.fn().mockResolvedValue({ success: true }),
  playlistUpdateDescription: vi.fn().mockResolvedValue({ success: true }),
  playlistUpdateCover: vi.fn().mockResolvedValue({ success: true }),
  playlistAddSongs: vi.fn().mockResolvedValue({ success: true, added: 0, alreadyInPlaylist: 0 }),
  playlistRemoveSong: vi.fn().mockResolvedValue({ success: true }),
  playlistReorderSongs: vi.fn().mockResolvedValue({ success: true }),
  playlistGetById: vi.fn().mockResolvedValue({ success: true, playlist: null }),
  playlistGetSongs: vi.fn().mockResolvedValue({ success: true, songPaths: [] }),
  playlistIsSongIn: vi.fn().mockResolvedValue({ success: true, isIn: false }),
  playlistGetContainingSong: vi.fn().mockResolvedValue({ success: true, playlists: [] }),
  playlistCleanupMissing: vi.fn().mockResolvedValue({ success: true, removedCount: 0 }),
  // Fingerprint mocks
  fingerprintCheckReady: vi.fn().mockResolvedValue({ ready: true }),
  fingerprintEnsureReady: vi.fn().mockResolvedValue({ success: true }),
  generateFingerprint: vi.fn().mockResolvedValue({ success: true, fingerprint: 'test-fp' }),
  fingerprintGetPoolInfo: vi.fn().mockResolvedValue({ workerCount: 4, cpuCount: 8 }),
  generateFingerprintsBatch: vi.fn().mockResolvedValue({ success: false }),
  onFingerprintBatchProgress: vi.fn(() => () => { }),
} as any
