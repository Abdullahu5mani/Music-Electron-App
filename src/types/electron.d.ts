import type { MusicFile } from '../../electron/musicScanner'

export interface BinaryDownloadProgress {
  status: 'checking' | 'not-found' | 'downloading' | 'downloaded' | 'installed' | 'updating' | 'version-check'
  message: string
  percentage?: number
}

export interface AppSettings {
  musicFolderPath: string | null
  downloadFolderPath: string | null
  scanSubfolders: boolean
}

export interface BinaryStatus {
  name: string
  installed: boolean
  version: string | null
  path: string | null
  latestVersion: string | null
  needsUpdate: boolean
}

export interface PlatformInfo {
  platform: string
  arch: string
}

export interface WhisperModel {
  id: string
  name: string
  filename: string
  size: string
  sizeBytes: number
  description: string
}

export interface AudioMetadata {
  title?: string
  artist?: string
  album?: string
  albumArtist?: string
  year?: number
  trackNumber?: number
  trackTotal?: number
  discNumber?: number
  discTotal?: number
  genre?: string
  comment?: string
  coverArtPath?: string  // Path to cover art image file
}

export type ScanStatusType = 'unscanned' | 'scanned-tagged' | 'scanned-no-match' | 'file-changed'

export interface FileScanStatus {
  filePath: string
  fileHash: string
  scannedAt: number
  mbid: string | null
  hasMetadata: boolean
}

export interface CacheScanStatistics {
  total: number
  withMetadata: number
  withoutMetadata: number
}

// Playlist types
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

export interface PlaylistWithSongs extends Playlist {
  songs: MusicFile[]
}

export interface ElectronAPI {
  scanMusicFolder: (folderPath: string, options?: { scanSubfolders?: boolean }) => Promise<MusicFile[]>
  selectMusicFolder: () => Promise<string | null>
  readSingleFileMetadata: (filePath: string) => Promise<MusicFile | null>
  getSettings: () => Promise<AppSettings>
  saveSettings: (settings: AppSettings) => Promise<{ success: boolean; error?: string }>
  selectDownloadFolder: () => Promise<string | null>
  getBinaryStatuses: () => Promise<BinaryStatus[]>
  installYtdlp: () => Promise<{ success: boolean; error?: string }>
  installFpcalc: () => Promise<{ success: boolean; error?: string }>
  installWhisper: () => Promise<{ success: boolean; error?: string }>
  getWhisperModels: () => Promise<WhisperModel[]>
  getSelectedWhisperModel: () => Promise<WhisperModel>
  setWhisperModel: (modelId: string) => Promise<{ success: boolean }>
  onBinaryInstallProgress: (callback: (progress: { binary: string; status: string; message: string; percentage: number }) => void) => () => void
  getPlatformInfo: () => Promise<PlatformInfo>
  readFileBuffer: (filePath: string) => Promise<number[]>
  onTrayPlayPause: (callback: () => void) => () => void
  sendPlaybackState: (isPlaying: boolean) => void
  sendWindowVisibility: (visible: boolean) => void
  minimizeWindow: () => void
  maximizeWindow: () => void
  closeWindow: () => void
  onWindowStateChanged: (callback: (maximized: boolean) => void) => () => void
  downloadYouTube: (url: string, outputPath: string) => Promise<{ success: boolean; filePath?: string; error?: string; title?: string }>
  onDownloadProgress: (callback: (progress: { percentage: number; downloaded: number; total: number; speed: string; eta: string }) => void) => () => void
  onBinaryDownloadProgress: (callback: (progress: BinaryDownloadProgress) => void) => () => void
  onDownloadTitle: (callback: (title: string) => void) => () => void
  cancelYouTubeDownload: () => Promise<boolean>
  downloadImage: (url: string, filePath: string) => Promise<{ success: boolean; error?: string }>
  downloadImageWithFallback: (urls: string[], filePath: string) => Promise<{ success: boolean; url?: string; error?: string }>
  writeCoverArt: (filePath: string, imagePath: string) => Promise<{ success: boolean; error?: string }>
  writeMetadata: (filePath: string, metadata: AudioMetadata) => Promise<{ success: boolean; error?: string }>
  lookupAcoustid: (fingerprint: string, duration: number) => Promise<{ mbid: string; title?: string; artist?: string } | null>
  lookupMusicBrainz: (mbid: string) => Promise<any>
  // Metadata cache operations
  cacheGetFileStatus: (filePath: string) => Promise<ScanStatusType>
  cacheMarkFileScanned: (filePath: string, mbid: string | null, hasMetadata: boolean) => Promise<boolean>
  cacheGetBatchStatus: (filePaths: string[]) => Promise<Record<string, ScanStatusType>>
  cacheGetUnscannedFiles: (filePaths: string[]) => Promise<string[]>
  cacheGetStatistics: () => Promise<CacheScanStatistics>
  cacheGetEntry: (filePath: string) => Promise<FileScanStatus | null>
  cacheCleanupOrphaned: () => Promise<number>
  cacheClear: () => Promise<boolean>
  // Fingerprint generation (Main Process - fpcalc binary)
  generateFingerprint: (filePath: string) => Promise<{ success: boolean; fingerprint?: string; duration?: number; error?: string }>
  fingerprintCheckReady: () => Promise<{ ready: boolean; path: string | null }>
  fingerprintEnsureReady: () => Promise<{ success: boolean; path?: string | null; error?: string }>
  // Parallel batch fingerprinting
  generateFingerprintsBatch: (filePaths: string[]) => Promise<{
    success: boolean
    results?: Array<{
      filePath: string
      success: boolean
      fingerprint: string | null
      duration: number | null
      workerId: number
      processingTimeMs: number
    }>
    stats?: {
      totalFiles: number
      successCount: number
      failCount: number
      totalTimeMs: number
      avgTimeMs: number
      cpuCount: number
      workerCount: number
    }
    error?: string
  }>
  fingerprintGetPoolInfo: () => Promise<{ cpuCount: number; workerCount: number }>
  onFingerprintBatchProgress: (callback: (progress: {
    completed: number
    total: number
    workerId: number
    fileName: string
    percentage: number
  }) => void) => () => void
  // Playlist operations
  playlistCreate: (name: string, description?: string) => Promise<{ success: boolean; playlist?: Playlist; error?: string }>
  playlistDelete: (playlistId: number) => Promise<{ success: boolean; error?: string }>
  playlistRename: (playlistId: number, newName: string) => Promise<{ success: boolean; error?: string }>
  playlistUpdateDescription: (playlistId: number, description: string | null) => Promise<{ success: boolean; error?: string }>
  playlistUpdateCover: (playlistId: number, coverArtPath: string | null) => Promise<{ success: boolean; error?: string }>
  playlistGetAll: () => Promise<{ success: boolean; playlists: Playlist[]; error?: string }>
  playlistGetById: (playlistId: number) => Promise<{ success: boolean; playlist: Playlist | null; error?: string }>
  playlistGetSongs: (playlistId: number) => Promise<{ success: boolean; songPaths: string[]; error?: string }>
  playlistAddSongs: (playlistId: number, filePaths: string[]) => Promise<{ success: boolean; added?: number; alreadyInPlaylist?: number; error?: string }>
  playlistRemoveSong: (playlistId: number, filePath: string) => Promise<{ success: boolean; error?: string }>
  playlistReorderSongs: (playlistId: number, newOrder: Array<{ filePath: string; position: number }>) => Promise<{ success: boolean; error?: string }>
  playlistIsSongIn: (playlistId: number, filePath: string) => Promise<{ success: boolean; isIn: boolean; error?: string }>
  playlistGetContainingSong: (filePath: string) => Promise<{ success: boolean; playlists: Playlist[]; error?: string }>
  playlistCleanupMissing: () => Promise<{ success: boolean; removedCount: number; error?: string }>
  // File watcher operations
  fileWatcherStart: (folderPath: string) => Promise<{ success: boolean; error?: string }>
  fileWatcherStop: () => Promise<{ success: boolean }>
  fileWatcherStatus: () => Promise<{ isWatching: boolean; watchPath: string | null }>
  fileWatcherIgnore: (filePath: string) => Promise<{ success: boolean }>
  onFileWatcherEvent: (callback: (event: { type: 'added' | 'removed' | 'changed'; files: string[] }) => void) => () => void
  processLyrics: (filePath: string) => Promise<{ success: boolean; message: string; lyrics?: string }>
  onLyricsProgress: (callback: (progress: { step: string; percentage: number }) => void) => () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}


