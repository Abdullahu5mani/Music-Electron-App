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
    scanMusicFolder: (folderPath: string, options?: { scanSubfolders?: boolean }) => Promise<MusicFile[]>
    selectMusicFolder: () => Promise<string | null>
    readSingleFileMetadata: (filePath: string) => Promise<MusicFile | null>
    getSettings: () => Promise<AppSettings>
    saveSettings: (settings: AppSettings) => Promise<{ success: boolean; error?: string }>
    selectDownloadFolder: () => Promise<string | null>
    getBinaryStatuses: () => Promise<BinaryStatus[]>
    installYtdlp: () => Promise<{ success: boolean; error?: string }>
    installFpcalc: () => Promise<{ success: boolean; error?: string }>
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
    playlistCreate: (name: string, description?: string) => Promise<{ success: boolean; playlist?: any; error?: string }>
    playlistDelete: (playlistId: number) => Promise<{ success: boolean; error?: string }>
    playlistRename: (playlistId: number, newName: string) => Promise<{ success: boolean; error?: string }>
    playlistUpdateDescription: (playlistId: number, description: string | null) => Promise<{ success: boolean; error?: string }>
    playlistUpdateCover: (playlistId: number, coverArtPath: string | null) => Promise<{ success: boolean; error?: string }>
    playlistGetAll: () => Promise<{ success: boolean; playlists: any[]; error?: string }>
    playlistGetById: (playlistId: number) => Promise<{ success: boolean; playlist: any | null; error?: string }>
    playlistGetSongs: (playlistId: number) => Promise<{ success: boolean; songPaths: string[]; error?: string }>
    playlistAddSongs: (playlistId: number, filePaths: string[]) => Promise<{ success: boolean; added?: number; alreadyInPlaylist?: number; error?: string }>
    playlistRemoveSong: (playlistId: number, filePath: string) => Promise<{ success: boolean; error?: string }>
    playlistReorderSongs: (playlistId: number, newOrder: Array<{ filePath: string; position: number }>) => Promise<{ success: boolean; error?: string }>
    playlistIsSongIn: (playlistId: number, filePath: string) => Promise<{ success: boolean; isIn: boolean; error?: string }>
    playlistGetContainingSong: (filePath: string) => Promise<{ success: boolean; playlists: any[]; error?: string }>
    playlistCleanupMissing: () => Promise<{ success: boolean; removedCount: number; error?: string }>

    // File watcher operations
    fileWatcherStart: (folderPath: string) => Promise<{ success: boolean; error?: string }>
    fileWatcherStop: () => Promise<{ success: boolean }>
    fileWatcherStatus: () => Promise<{ isWatching: boolean; watchPath: string | null }>
    onFileWatcherEvent: (callback: (event: { type: 'added' | 'removed' | 'changed'; files: string[] }) => void) => () => void
}

// Expose a typed API to the Renderer process
contextBridge.exposeInMainWorld('electronAPI', {
    scanMusicFolder: (folderPath: string, options?: { scanSubfolders?: boolean }) =>
        ipcRenderer.invoke('scan-music-folder', folderPath, options),

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

    installYtdlp: () =>
        ipcRenderer.invoke('install-ytdlp'),

    installFpcalc: () =>
        ipcRenderer.invoke('install-fpcalc'),

    installWhisper: () =>
        ipcRenderer.invoke('install-whisper'),

    getWhisperModels: () =>
        ipcRenderer.invoke('get-whisper-models'),

    getSelectedWhisperModel: () =>
        ipcRenderer.invoke('get-selected-whisper-model'),

    setWhisperModel: (modelId: string) =>
        ipcRenderer.invoke('set-whisper-model', modelId),

    onBinaryInstallProgress: (callback: (progress: { binary: string; status: string; message: string; percentage: number }) => void) => {
        const handler = (_event: any, progress: any) => callback(progress)
        ipcRenderer.on('binary-install-progress', handler)
        return () => {
            ipcRenderer.removeListener('binary-install-progress', handler)
        }
    },

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

    // Fingerprint generation (Main Process - fpcalc binary)
    generateFingerprint: (filePath: string) =>
        ipcRenderer.invoke('generate-fingerprint', filePath),

    fingerprintCheckReady: () =>
        ipcRenderer.invoke('fingerprint-check-ready'),

    fingerprintEnsureReady: () =>
        ipcRenderer.invoke('fingerprint-ensure-ready'),

    // Parallel batch fingerprinting
    generateFingerprintsBatch: (filePaths: string[]) =>
        ipcRenderer.invoke('generate-fingerprints-batch', filePaths),

    fingerprintGetPoolInfo: () =>
        ipcRenderer.invoke('fingerprint-get-pool-info'),

    onFingerprintBatchProgress: (callback: (progress: {
        completed: number
        total: number
        workerId: number
        fileName: string
        percentage: number
    }) => void) => {
        const handler = (_event: any, progress: any) => callback(progress)
        ipcRenderer.on('fingerprint-batch-progress', handler)
        return () => ipcRenderer.removeListener('fingerprint-batch-progress', handler)
    },

    // Playlist operations
    playlistCreate: (name: string, description?: string) =>
        ipcRenderer.invoke('playlist-create', name, description),

    playlistDelete: (playlistId: number) =>
        ipcRenderer.invoke('playlist-delete', playlistId),

    playlistRename: (playlistId: number, newName: string) =>
        ipcRenderer.invoke('playlist-rename', playlistId, newName),

    playlistUpdateDescription: (playlistId: number, description: string | null) =>
        ipcRenderer.invoke('playlist-update-description', playlistId, description),

    playlistUpdateCover: (playlistId: number, coverArtPath: string | null) =>
        ipcRenderer.invoke('playlist-update-cover', playlistId, coverArtPath),

    playlistGetAll: () =>
        ipcRenderer.invoke('playlist-get-all'),

    playlistGetById: (playlistId: number) =>
        ipcRenderer.invoke('playlist-get-by-id', playlistId),

    playlistGetSongs: (playlistId: number) =>
        ipcRenderer.invoke('playlist-get-songs', playlistId),

    playlistAddSongs: (playlistId: number, filePaths: string[]) =>
        ipcRenderer.invoke('playlist-add-songs', playlistId, filePaths),

    playlistRemoveSong: (playlistId: number, filePath: string) =>
        ipcRenderer.invoke('playlist-remove-song', playlistId, filePath),

    playlistReorderSongs: (playlistId: number, newOrder: Array<{ filePath: string; position: number }>) =>
        ipcRenderer.invoke('playlist-reorder-songs', playlistId, newOrder),

    playlistIsSongIn: (playlistId: number, filePath: string) =>
        ipcRenderer.invoke('playlist-is-song-in', playlistId, filePath),

    playlistGetContainingSong: (filePath: string) =>
        ipcRenderer.invoke('playlist-get-containing-song', filePath),

    playlistCleanupMissing: () =>
        ipcRenderer.invoke('playlist-cleanup-missing'),

    // File watcher operations
    fileWatcherStart: (folderPath: string) =>
        ipcRenderer.invoke('file-watcher-start', folderPath),

    fileWatcherStop: () =>
        ipcRenderer.invoke('file-watcher-stop'),

    fileWatcherStatus: () =>
        ipcRenderer.invoke('file-watcher-status'),

    fileWatcherIgnore: (filePath: string) =>
        ipcRenderer.invoke('file-watcher-ignore', filePath),

    onFileWatcherEvent: (callback: (event: { type: 'added' | 'removed' | 'changed'; files: string[] }) => void) => {
        const handler = (_event: any, data: any) => callback(data)
        ipcRenderer.on('file-watcher-event', handler)
        return () => {
            ipcRenderer.removeListener('file-watcher-event', handler)
        }
    },

    processLyrics: (filePath: string) =>
        ipcRenderer.invoke('process-lyrics', filePath),

    onLyricsProgress: (callback: (progress: { step: string; percentage: number }) => void) => {
        const handler = (_event: any, progress: any) => callback(progress)
        ipcRenderer.on('lyrics-progress', handler)
        return () => {
            ipcRenderer.removeListener('lyrics-progress', handler)
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
