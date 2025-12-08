import type { MusicFile } from '../electron/musicScanner'

export interface BinaryDownloadProgress {
  status: 'checking' | 'not-found' | 'downloading' | 'downloaded' | 'installed' | 'updating' | 'version-check'
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

export interface ElectronAPI {
  scanMusicFolder: (folderPath: string) => Promise<MusicFile[]>
  selectMusicFolder: () => Promise<string | null>
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
  writeCoverArt: (filePath: string, imagePath: string) => Promise<{ success: boolean; error?: string }>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

