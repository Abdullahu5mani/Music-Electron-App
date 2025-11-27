import type { MusicFile } from '../electron/musicScanner'

export interface BinaryDownloadProgress {
  status: 'checking' | 'not-found' | 'downloading' | 'downloaded' | 'installed'
  message: string
  percentage?: number
}

export interface ElectronAPI {
  scanMusicFolder: (folderPath: string) => Promise<MusicFile[]>
  selectMusicFolder: () => Promise<string | null>
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
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

