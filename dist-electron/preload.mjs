"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  scanMusicFolder: (folderPath, options) => electron.ipcRenderer.invoke("scan-music-folder", folderPath, options),
  selectMusicFolder: () => electron.ipcRenderer.invoke("select-music-folder"),
  readSingleFileMetadata: (filePath) => electron.ipcRenderer.invoke("read-single-file-metadata", filePath),
  // Settings methods
  getSettings: () => electron.ipcRenderer.invoke("get-settings"),
  saveSettings: (settings) => electron.ipcRenderer.invoke("save-settings", settings),
  selectDownloadFolder: () => electron.ipcRenderer.invoke("select-download-folder"),
  getBinaryStatuses: () => electron.ipcRenderer.invoke("get-binary-statuses"),
  installYtdlp: () => electron.ipcRenderer.invoke("install-ytdlp"),
  installFpcalc: () => electron.ipcRenderer.invoke("install-fpcalc"),
  installWhisper: () => electron.ipcRenderer.invoke("install-whisper"),
  getWhisperModels: () => electron.ipcRenderer.invoke("get-whisper-models"),
  getSelectedWhisperModel: () => electron.ipcRenderer.invoke("get-selected-whisper-model"),
  setWhisperModel: (modelId) => electron.ipcRenderer.invoke("set-whisper-model", modelId),
  onBinaryInstallProgress: (callback) => {
    const handler = (_event, progress) => callback(progress);
    electron.ipcRenderer.on("binary-install-progress", handler);
    return () => {
      electron.ipcRenderer.removeListener("binary-install-progress", handler);
    };
  },
  getPlatformInfo: () => electron.ipcRenderer.invoke("get-platform-info"),
  readFileBuffer: (filePath) => electron.ipcRenderer.invoke("read-file-buffer", filePath),
  // Listen for tray play/pause commands
  onTrayPlayPause: (callback) => {
    const handler = () => callback();
    electron.ipcRenderer.on("tray-play-pause", handler);
    return () => {
      electron.ipcRenderer.removeListener("tray-play-pause", handler);
    };
  },
  // Send playback state to main process
  sendPlaybackState: (isPlaying) => {
    electron.ipcRenderer.send("playback-state-changed", isPlaying);
  },
  // Send window visibility state to main process
  sendWindowVisibility: (visible) => {
    electron.ipcRenderer.send("window-visibility-changed", visible);
  },
  // Window control methods
  minimizeWindow: () => {
    electron.ipcRenderer.send("window-minimize");
  },
  maximizeWindow: () => {
    electron.ipcRenderer.send("window-maximize");
  },
  closeWindow: () => {
    electron.ipcRenderer.send("window-close");
  },
  // Listen for window state changes
  onWindowStateChanged: (callback) => {
    const handler = (_event, maximized) => callback(maximized);
    electron.ipcRenderer.on("window-state-changed", handler);
    return () => {
      electron.ipcRenderer.removeListener("window-state-changed", handler);
    };
  },
  // YouTube download method
  downloadYouTube: (url, outputPath) => electron.ipcRenderer.invoke("download-youtube", url, outputPath),
  // Listen for download progress updates
  onDownloadProgress: (callback) => {
    const handler = (_event, progress) => callback(progress);
    electron.ipcRenderer.on("download-progress", handler);
    return () => {
      electron.ipcRenderer.removeListener("download-progress", handler);
    };
  },
  // Listen for binary download progress updates
  onBinaryDownloadProgress: (callback) => {
    const handler = (_event, progress) => callback(progress);
    electron.ipcRenderer.on("binary-download-progress", handler);
    return () => {
      electron.ipcRenderer.removeListener("binary-download-progress", handler);
    };
  },
  // Listen for download title updates
  onDownloadTitle: (callback) => {
    const handler = (_event, title) => callback(title);
    electron.ipcRenderer.on("download-title", handler);
    return () => {
      electron.ipcRenderer.removeListener("download-title", handler);
    };
  },
  downloadImage: (url, filePath) => electron.ipcRenderer.invoke("download-image", url, filePath),
  downloadImageWithFallback: (urls, filePath) => electron.ipcRenderer.invoke("download-image-with-fallback", urls, filePath),
  writeCoverArt: (filePath, imagePath) => electron.ipcRenderer.invoke("write-cover-art", filePath, imagePath),
  writeMetadata: (filePath, metadata) => electron.ipcRenderer.invoke("write-metadata", filePath, metadata),
  lookupAcoustid: (fingerprint, duration) => electron.ipcRenderer.invoke("lookup-acoustid", fingerprint, duration),
  lookupMusicBrainz: (mbid) => electron.ipcRenderer.invoke("lookup-musicbrainz", mbid),
  // Metadata cache operations
  cacheGetFileStatus: (filePath) => electron.ipcRenderer.invoke("cache-get-file-status", filePath),
  cacheMarkFileScanned: (filePath, mbid, hasMetadata) => electron.ipcRenderer.invoke("cache-mark-file-scanned", filePath, mbid, hasMetadata),
  cacheGetBatchStatus: (filePaths) => electron.ipcRenderer.invoke("cache-get-batch-status", filePaths),
  cacheGetUnscannedFiles: (filePaths) => electron.ipcRenderer.invoke("cache-get-unscanned-files", filePaths),
  cacheGetStatistics: () => electron.ipcRenderer.invoke("cache-get-statistics"),
  cacheGetEntry: (filePath) => electron.ipcRenderer.invoke("cache-get-entry", filePath),
  cacheCleanupOrphaned: () => electron.ipcRenderer.invoke("cache-cleanup-orphaned"),
  cacheClear: () => electron.ipcRenderer.invoke("cache-clear"),
  // Fingerprint generation (Main Process - fpcalc binary)
  generateFingerprint: (filePath) => electron.ipcRenderer.invoke("generate-fingerprint", filePath),
  fingerprintCheckReady: () => electron.ipcRenderer.invoke("fingerprint-check-ready"),
  fingerprintEnsureReady: () => electron.ipcRenderer.invoke("fingerprint-ensure-ready"),
  // Parallel batch fingerprinting
  generateFingerprintsBatch: (filePaths) => electron.ipcRenderer.invoke("generate-fingerprints-batch", filePaths),
  fingerprintGetPoolInfo: () => electron.ipcRenderer.invoke("fingerprint-get-pool-info"),
  onFingerprintBatchProgress: (callback) => {
    const handler = (_event, progress) => callback(progress);
    electron.ipcRenderer.on("fingerprint-batch-progress", handler);
    return () => electron.ipcRenderer.removeListener("fingerprint-batch-progress", handler);
  },
  // Playlist operations
  playlistCreate: (name, description) => electron.ipcRenderer.invoke("playlist-create", name, description),
  playlistDelete: (playlistId) => electron.ipcRenderer.invoke("playlist-delete", playlistId),
  playlistRename: (playlistId, newName) => electron.ipcRenderer.invoke("playlist-rename", playlistId, newName),
  playlistUpdateDescription: (playlistId, description) => electron.ipcRenderer.invoke("playlist-update-description", playlistId, description),
  playlistUpdateCover: (playlistId, coverArtPath) => electron.ipcRenderer.invoke("playlist-update-cover", playlistId, coverArtPath),
  playlistGetAll: () => electron.ipcRenderer.invoke("playlist-get-all"),
  playlistGetById: (playlistId) => electron.ipcRenderer.invoke("playlist-get-by-id", playlistId),
  playlistGetSongs: (playlistId) => electron.ipcRenderer.invoke("playlist-get-songs", playlistId),
  playlistAddSongs: (playlistId, filePaths) => electron.ipcRenderer.invoke("playlist-add-songs", playlistId, filePaths),
  playlistRemoveSong: (playlistId, filePath) => electron.ipcRenderer.invoke("playlist-remove-song", playlistId, filePath),
  playlistReorderSongs: (playlistId, newOrder) => electron.ipcRenderer.invoke("playlist-reorder-songs", playlistId, newOrder),
  playlistIsSongIn: (playlistId, filePath) => electron.ipcRenderer.invoke("playlist-is-song-in", playlistId, filePath),
  playlistGetContainingSong: (filePath) => electron.ipcRenderer.invoke("playlist-get-containing-song", filePath),
  playlistCleanupMissing: () => electron.ipcRenderer.invoke("playlist-cleanup-missing"),
  // File watcher operations
  fileWatcherStart: (folderPath) => electron.ipcRenderer.invoke("file-watcher-start", folderPath),
  fileWatcherStop: () => electron.ipcRenderer.invoke("file-watcher-stop"),
  fileWatcherStatus: () => electron.ipcRenderer.invoke("file-watcher-status"),
  fileWatcherIgnore: (filePath) => electron.ipcRenderer.invoke("file-watcher-ignore", filePath),
  onFileWatcherEvent: (callback) => {
    const handler = (_event, data) => callback(data);
    electron.ipcRenderer.on("file-watcher-event", handler);
    return () => {
      electron.ipcRenderer.removeListener("file-watcher-event", handler);
    };
  },
  processLyrics: (filePath) => electron.ipcRenderer.invoke("process-lyrics", filePath),
  onLyricsProgress: (callback) => {
    const handler = (_event, progress) => callback(progress);
    electron.ipcRenderer.on("lyrics-progress", handler);
    return () => {
      electron.ipcRenderer.removeListener("lyrics-progress", handler);
    };
  }
});
electron.contextBridge.exposeInMainWorld("ipcRenderer", {
  on(...args) {
    const [channel, listener] = args;
    return electron.ipcRenderer.on(channel, (event, ...args2) => listener(event, ...args2));
  },
  off(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.off(channel, ...omit);
  },
  send(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.send(channel, ...omit);
  },
  invoke(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.invoke(channel, ...omit);
  }
});
