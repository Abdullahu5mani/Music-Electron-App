import { contextBridge, ipcRenderer } from 'electron'
import type { MusicFile } from './musicScanner'

export interface BinaryDownloadProgress {
  status: 'checking' | 'not-found' | 'downloading' | 'downloaded' | 'installed'
  message: string
  percentage?: number
}

export interface AppSettings {
  musicFolderPath: string | null
  downloadFolderPath: string | null
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

export interface ElectronAPI {
  scanMusicFolder: (folderPath: string) => Promise<MusicFile[]>
  selectMusicFolder: () => Promise<string | null>
  readSingleFileMetadata: (filePath: string) => Promise<MusicFile | null>
  getSettings: () => Promise<AppSettings>
  saveSettings: (settings: AppSettings) => Promise<{ success: boolean; error?: string }>
  selectDownloadFolder: () => Promise<string | null>
  getBinaryStatuses: () => Promise<BinaryStatus[]>
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
  downloadImage: (url: string, filePath: string) => Promise<{ success: boolean; error?: string }>
  downloadImageWithFallback: (urls: string[], filePath: string) => Promise<{ success: boolean; url?: string; error?: string }>
  writeCoverArt: (filePath: string, imagePath: string) => Promise<{ success: boolean; error?: string }>
  writeMetadata: (filePath: string, metadata: AudioMetadata) => Promise<{ success: boolean; error?: string }>
  lookupAcoustid: (fingerprint: string, duration: number) => Promise<any>
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
  analyzeTrack: (filePath: string) => Promise<any>
}

// Expose a typed API to the Renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  scanMusicFolder: (folderPath: string) =>
    ipcRenderer.invoke('scan-music-folder', folderPath),

  selectMusicFolder: () =>
    ipcRenderer.invoke('select-music-folder'),

  readSingleFileMetadata: (filePath: string) =>
    ipcRenderer.invoke('read-single-file-metadata', filePath),

  // Settings methods
  getSettings: () =>
    ipcRenderer.invoke('get-settings'),

  saveSettings: (settings: AppSettings) =>
    ipcRenderer.invoke('save-settings', settings),

  selectDownloadFolder: () =>
    ipcRenderer.invoke('select-download-folder'),

  getBinaryStatuses: () =>
    ipcRenderer.invoke('get-binary-statuses'),

  getPlatformInfo: () =>
    ipcRenderer.invoke('get-platform-info'),

  readFileBuffer: (filePath: string) =>
    ipcRenderer.invoke('read-file-buffer', filePath),

  // Listen for tray play/pause commands
  onTrayPlayPause: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('tray-play-pause', handler)
    // Return cleanup function
    return () => {
      ipcRenderer.removeListener('tray-play-pause', handler)
    }
  },

  // Send playback state to main process
  sendPlaybackState: (isPlaying: boolean) => {
    ipcRenderer.send('playback-state-changed', isPlaying)
  },

  // Send window visibility state to main process
  sendWindowVisibility: (visible: boolean) => {
    ipcRenderer.send('window-visibility-changed', visible)
  },

  // Window control methods
  minimizeWindow: () => {
    ipcRenderer.send('window-minimize')
  },

  maximizeWindow: () => {
    ipcRenderer.send('window-maximize')
  },

  closeWindow: () => {
    ipcRenderer.send('window-close')
  },

  // Listen for window state changes
  onWindowStateChanged: (callback: (maximized: boolean) => void) => {
    const handler = (_event: any, maximized: boolean) => callback(maximized)
    ipcRenderer.on('window-state-changed', handler)
    return () => {
      ipcRenderer.removeListener('window-state-changed', handler)
    }
  },

  // YouTube download method
  downloadYouTube: (url: string, outputPath: string) =>
    ipcRenderer.invoke('download-youtube', url, outputPath),

  // Listen for download progress updates
  onDownloadProgress: (callback: (progress: any) => void) => {
    const handler = (_event: any, progress: any) => callback(progress)
    ipcRenderer.on('download-progress', handler)
    return () => {
      ipcRenderer.removeListener('download-progress', handler)
    }
  },

  // Listen for binary download progress updates
  onBinaryDownloadProgress: (callback: (progress: BinaryDownloadProgress) => void) => {
    const handler = (_event: any, progress: BinaryDownloadProgress) => callback(progress)
    ipcRenderer.on('binary-download-progress', handler)
    return () => {
      ipcRenderer.removeListener('binary-download-progress', handler)
    }
  },

  // Listen for download title updates
  onDownloadTitle: (callback: (title: string) => void) => {
    const handler = (_event: any, title: string) => callback(title)
    ipcRenderer.on('download-title', handler)
    return () => {
      ipcRenderer.removeListener('download-title', handler)
    }
  },

  downloadImage: (url: string, filePath: string) =>
    ipcRenderer.invoke('download-image', url, filePath),

  downloadImageWithFallback: (urls: string[], filePath: string) =>
    ipcRenderer.invoke('download-image-with-fallback', urls, filePath),

  writeCoverArt: (filePath: string, imagePath: string) =>
    ipcRenderer.invoke('write-cover-art', filePath, imagePath),

  writeMetadata: (filePath: string, metadata: AudioMetadata) =>
    ipcRenderer.invoke('write-metadata', filePath, metadata),

  lookupAcoustid: (fingerprint: string, duration: number) =>
    ipcRenderer.invoke('lookup-acoustid', fingerprint, duration),

  lookupMusicBrainz: (mbid: string) =>
    ipcRenderer.invoke('lookup-musicbrainz', mbid),

  // Metadata cache operations
  cacheGetFileStatus: (filePath: string) =>
    ipcRenderer.invoke('cache-get-file-status', filePath),

  cacheMarkFileScanned: (filePath: string, mbid: string | null, hasMetadata: boolean) =>
    ipcRenderer.invoke('cache-mark-file-scanned', filePath, mbid, hasMetadata),

  cacheGetBatchStatus: (filePaths: string[]) =>
    ipcRenderer.invoke('cache-get-batch-status', filePaths),

  cacheGetUnscannedFiles: (filePaths: string[]) =>
    ipcRenderer.invoke('cache-get-unscanned-files', filePaths),

  cacheGetStatistics: () =>
    ipcRenderer.invoke('cache-get-statistics'),

  cacheGetEntry: (filePath: string) =>
    ipcRenderer.invoke('cache-get-entry', filePath),

  cacheCleanupOrphaned: () =>
    ipcRenderer.invoke('cache-cleanup-orphaned'),

  cacheClear: () =>
    ipcRenderer.invoke('cache-clear'),

  analyzeTrack: (filePath: string) =>
    ipcRenderer.invoke('analyze-track', filePath),
} as ElectronAPI)

// Keep the old ipcRenderer for backward compatibility if needed
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },
})
