"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  scanMusicFolder: (folderPath) => electron.ipcRenderer.invoke("scan-music-folder", folderPath),
  selectMusicFolder: () => electron.ipcRenderer.invoke("select-music-folder"),
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
