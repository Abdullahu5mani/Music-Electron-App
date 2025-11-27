import { contextBridge, ipcRenderer } from 'electron'
import type { MusicFile } from './musicScanner'

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

// Expose a typed API to the Renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  scanMusicFolder: (folderPath: string) => 
    ipcRenderer.invoke('scan-music-folder', folderPath),
  
  selectMusicFolder: () => 
    ipcRenderer.invoke('select-music-folder'),
  
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
