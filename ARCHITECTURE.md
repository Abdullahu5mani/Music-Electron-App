# Music Sync App - Architecture Documentation

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Electron Primer (For Beginners)](#electron-primer-for-beginners)
4. [High-Level Architecture](#high-level-architecture)
5. [Directory Structure](#directory-structure)
6. [Main Process](#main-process)
7. [Renderer Process](#renderer-process)
8. [IPC Communication](#ipc-communication)
9. [Core Flows](#core-flows)
10. [External API Integration](#external-api-integration)
11. [Security Architecture](#security-architecture)
12. [Cross-Platform Strategy](#cross-platform-strategy)
13. [Key Design Patterns](#key-design-patterns)
14. [Known Limitations & Future Work](#known-limitations--future-work)
15. [Running the App](#running-the-app)

---

## Overview

This is an **Electron + React + TypeScript** desktop music player application. It allows users to:

- Browse and play local music files
- Download music from YouTube using `yt-dlp`
- Control playback from the system tray
- Identify songs using audio fingerprinting (AcoustID + MusicBrainz)
- Custom frameless window with a soft blue title bar
- Filter library by artist/album via sidebar

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Runtime** | Electron 39 | Desktop app framework |
| **Frontend** | React 18 + TypeScript | UI components |
| **Build Tool** | Vite 7 | Fast dev server & bundling |
| **Audio Playback** | Howler.js | Cross-platform audio |
| **Metadata** | music-metadata | Extract ID3 tags & album art |
| **YouTube** | yt-dlp-wrap | Download audio from YouTube |
| **Audio Fingerprinting** | fpcalc (Chromaprint CLI) | Generate audio fingerprints (Main Process) |
| **Tag Writing** | taglib-wasm | Write cover art to files |
| **Database** | better-sqlite3 | SQLite metadata cache |
| **Sliders** | rc-slider | Seek bar & volume control |
| **Scrollbars** | overlayscrollbars-react | Custom themed scrollbars |
| **HTTP** | axios | API requests |
| **Styling** | CSS (no framework) | Custom responsive design |

---

## Electron Primer (For Beginners)

**Electron** is a framework that lets you build desktop applications using web technologies (HTML, CSS, JavaScript). It combines:

- **Chromium** (the browser engine behind Chrome) → Renders your UI
- **Node.js** (JavaScript runtime) → Gives access to system APIs

This means you can create a desktop app that looks like a website but can access files, show system notifications, and run in the background.

### Two-Process Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         YOUR DESKTOP APP                            │
│                                                                     │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐  │
│  │      MAIN PROCESS           │  │     RENDERER PROCESS        │  │
│  │     (Node.js world)         │  │    (Browser/React world)    │  │
│  │                             │  │                             │  │
│  │  • Runs in the background   │  │  • Shows the UI             │  │
│  │  • Has full system access   │  │  • Like a web page          │  │
│  │  • Creates windows          │  │  • Cannot access files      │  │
│  │  • Reads/writes files       │  │    directly (for security)  │  │
│  │  • Downloads from internet  │  │  • Communicates via IPC     │  │
│  │  • Shows tray icon          │  │                             │  │
│  └─────────────────────────────┘  └─────────────────────────────┘  │
│               │                              │                      │
│               └──────────── IPC ─────────────┘                      │
│                    (Inter-Process Communication)                    │
└─────────────────────────────────────────────────────────────────────┘
```

**IPC (Inter-Process Communication)** is how these two processes talk to each other:
- The Renderer says: "Hey Main, please scan this folder for music files"
- The Main does the work and replies: "Here are the 50 songs I found"

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ELECTRON APPLICATION                           │
│                                                                             │
│  ┌─────────────────────────────────┐    ┌─────────────────────────────────┐ │
│  │        MAIN PROCESS             │    │      RENDERER PROCESS           │ │
│  │         (Node.js)               │◄──►│        (React + Vite)           │ │
│  │                                 │IPC │                                 │ │
│  │  ┌───────────┐ ┌─────────────┐  │    │  ┌───────────┐ ┌─────────────┐  │ │
│  │  │  main.ts  │ │  window.ts  │  │    │  │  App.tsx  │ │ Components  │  │ │
│  │  └───────────┘ └─────────────┘  │    │  └───────────┘ └─────────────┘  │ │
│  │  ┌───────────┐ ┌─────────────┐  │    │  ┌───────────┐ ┌─────────────┐  │ │
│  │  │  tray.ts  │ │ handlers.ts │  │    │  │   Hooks   │ │   Styles    │  │ │
│  │  └───────────┘ └─────────────┘  │    │  └───────────┘ └─────────────┘  │ │
│  │  ┌───────────┐ ┌─────────────┐  │    │                                 │ │
│  │  │ scanner.ts│ │downloader.ts│  │    │                                 │ │
│  │  └───────────┘ └─────────────┘  │    │                                 │ │
│  │  ┌───────────┐ ┌─────────────┐  │    │                                 │ │
│  │  │settings.ts│ │binaryMgr.ts │  │    │                                 │ │
│  │  └───────────┘ └─────────────┘  │    │                                 │ │
│  └─────────────────────────────────┘    └─────────────────────────────────┘ │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                           PRELOAD SCRIPT                                ││
│  │                          (preload.ts)                                   ││
│  │                     Secure Bridge: Main ↔ Renderer                      ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
Music-Electron-App/
├── electron/                    # Main Process (Node.js)
│   ├── main.ts                  # Entry point, app initialization
│   ├── window.ts                # Window creation and management
│   ├── preload.ts               # IPC bridge (Main ↔ Renderer)
│   ├── tray.ts                  # System tray icon and menu
│   ├── musicScanner.ts          # File system scanning & metadata
│   ├── youtubeDownloader.ts     # YouTube download with yt-dlp
│   ├── settings.ts              # Settings persistence (JSON)
│   ├── binaryManager.ts         # Binary status checking (yt-dlp)
│   ├── fpcalcManager.ts         # fpcalc binary download & fingerprinting
│   ├── metadataCache.ts         # SQLite database for scan tracking
│   └── ipc/
│       ├── handlers.ts          # Main IPC registration (imports modules)
│       └── modules/             # Modular IPC handlers
│           ├── musicHandlers.ts     # Folder scanning, cover art writing
│           ├── apiHandlers.ts       # AcoustID, MusicBrainz, image download
│           ├── youtubeHandlers.ts   # YouTube download, binary status
│           ├── systemHandlers.ts    # Window controls, settings, platform
│           ├── cacheHandlers.ts     # Metadata cache operations
│           └── fingerprintHandlers.ts # Audio fingerprinting (fpcalc)
│
├── src/                         # Renderer Process (React)
│   ├── App.tsx                  # Main React component
│   ├── App.css                  # Main styles
│   ├── electron.d.ts            # TypeScript definitions for IPC
│   ├── pathResolver.ts          # Convert paths to file:// URLs
│   ├── components/              # UI Components
│   │   ├── TitleBar.tsx         # Custom window title bar
│   │   ├── SongList.tsx         # Music file list display
│   │   ├── PlaybackBar.tsx      # Playback controls + sliders
│   │   ├── Sidebar.tsx          # Library filtering sidebar
│   │   ├── Settings.tsx         # Settings modal
│   │   ├── DownloadButton.tsx   # YouTube download trigger
│   │   ├── DownloadNotification.tsx  # Download progress toast
│   │   └── NotificationToast.tsx     # General notifications
│   ├── hooks/                   # Custom React Hooks
│   │   ├── useAudioPlayer.ts    # Audio playback logic (Howler.js)
│   │   ├── useMusicLibrary.ts   # Library management
│   │   └── useSongScanner.ts    # Batch scanning with rate limits
│   └── utils/
│       ├── sortMusicFiles.ts    # Sorting utilities
│       ├── fingerprintGenerator.ts  # Audio fingerprint generation
│       ├── acoustidClient.ts    # AcoustID API client
│       └── musicbrainzClient.ts # MusicBrainz API client
│
├── vite.config.ts               # Vite + Electron build configuration
├── electron-builder.json5       # Packaging configuration
├── package.json                 # Dependencies and scripts
└── index.html                   # Entry HTML file
```

---

## Main Process

The **Main Process** runs in Node.js and handles all system-level operations.

### Entry Point: `main.ts`

Boots the application with this startup flow:

```
┌──────────────────────────────────────────────────────────┐
│  main.ts - Startup Flow                                  │
│  ┌────────────────────────────────────────────────────┐  │
│  │ app.whenReady()                                    │  │
│  │    ↓                                               │  │
│  │ Menu.setApplicationMenu(null)   // Remove menu    │  │
│  │    ↓                                               │  │
│  │ registerIpcHandlers()           // Setup IPC      │  │
│  │    ↓                                               │  │
│  │ setupWindowEvents()             // Handle events  │  │
│  │    ↓                                               │  │
│  │ Register F12 shortcut           // DevTools       │  │
│  │    ↓                                               │  │
│  │ createWindow()                  // Create window  │  │
│  │    ↓                                               │  │
│  │ createTray()                    // System tray    │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### Core Modules

| File | Purpose |
|------|---------|
| **`window.ts`** | Creates frameless BrowserWindow with sizing limits, background color, preload script. Sets `webSecurity: false` for `file://` playback. Handles show/hide/maximize events and forwards window state changes to renderer. |
| **`preload.ts`** | Runs in isolated context; exposes typed `electronAPI` via `contextBridge`. Maps renderer calls to `ipcRenderer.invoke/send` and registers event listeners with cleanup functions. |
| **`tray.ts`** | Builds system tray icon and menu (Show/Hide, Play/Pause, Quit). Updates labels based on playback state and window visibility. Forwards tray play/pause clicks to renderer. |
| **`musicScanner.ts`** | Recursively scans folders for supported audio extensions, reads tags with `music-metadata`, converts album art to base64. Provides single-file metadata read for in-place UI updates. |
| **`youtubeDownloader.ts`** | Ensures yt-dlp binary exists (platform/arch-specific download if missing). Executes downloads with audio extraction, thumbnail embedding, and metadata. Emits progress events with 10s cooldown between downloads. |
| **`settings.ts`** | Persists JSON settings (music folder, download folder) under `app.getPath('userData')`. |
| **`binaryManager.ts`** | Resolves yt-dlp binary path per platform/arch. Checks installation and version, flags corrupted binaries for redownload. Resolves ffmpeg path from asar. |
| **`fpcalcManager.ts`** | Manages fpcalc (Chromaprint) binary for audio fingerprinting. Auto-downloads platform-specific binary on first use. Runs fingerprinting in subprocess to avoid memory limits. |
| **`metadataCache.ts`** | SQLite cache keyed by file hash (path + size + mtime) to track scan status and avoid reprocessing unchanged files. |

### Window Configuration

```typescript
win = new BrowserWindow({
  width: 800, height: 700,
  minWidth: 450, minHeight: 600,
  frame: false,                   // Remove default window frame
  titleBarStyle: 'hidden',        // macOS-specific
  backgroundColor: '#1a1a1a',
  webPreferences: {
    preload: path.join(__dirname, 'preload.mjs'),
    webSecurity: false,           // Allow file:// protocol
  },
})
```

### Preload Script API Surface

```
┌─────────────────────────────────────────────────────────────────────┐
│                          preload.ts                                 │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    contextBridge.exposeInMainWorld            │  │
│  │                         'electronAPI'                          │  │
│  │                                                                │  │
│  │  INVOKE (Request → Response)        SEND (Fire & Forget)      │  │
│  │  ─────────────────────────────      ─────────────────────     │  │
│  │  • scanMusicFolder()                • sendPlaybackState()     │  │
│  │  • selectMusicFolder()              • minimizeWindow()        │  │
│  │  • readSingleFileMetadata()         • maximizeWindow()        │  │
│  │  • downloadYouTube()                • closeWindow()           │  │
│  │  • getSettings()                                             │  │
│  │  • saveSettings()                                             │  │
│  │  • getBinaryStatuses()                                        │  │
│  │                                                                │  │
│  │  LISTENERS (Main → Renderer)                                   │  │
│  │  ─────────────────────────────                                │  │
│  │  • onDownloadProgress()                                       │  │
│  │  • onDownloadTitle()                                          │  │
│  │  • onBinaryDownloadProgress()                                 │  │
│  │  • onWindowStateChanged()                                     │  │
│  │  • onTrayPlayPause()                                          │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Metadata Cache (SQLite)

Tracks which music files have been scanned/fingerprinted using an SQLite database. This prevents re-scanning unchanged files and persists scan results across app restarts.

**Database Location:**
- Windows: `%APPDATA%/music-sync-app/metadata-cache.db`
- macOS: `~/Library/Application Support/music-sync-app/metadata-cache.db`
- Linux: `~/.config/music-sync-app/metadata-cache.db`

**Database Schema:**

```sql
CREATE TABLE metadata_cache (
  filePath TEXT PRIMARY KEY,     -- Full path to music file
  fileHash TEXT NOT NULL,        -- SHA256(path + size + mtime)
  scannedAt INTEGER NOT NULL,    -- Unix timestamp of scan
  mbid TEXT,                     -- MusicBrainz ID (if matched)
  hasMetadata INTEGER NOT NULL   -- 1 = tagged, 0 = no match
)
```

**File Change Detection:**

```typescript
function generateFileHash(filePath: string): string {
  const stats = fs.statSync(filePath)
  const hashInput = `${filePath}:${stats.size}:${stats.mtimeMs}`
  return crypto.createHash('sha256').update(hashInput).digest('hex')
}
```

**Scan Status Types:**

| Status | Description | UI Icon |
|--------|-------------|---------|
| `unscanned` | Not in database or never scanned | 🔍 |
| `scanned-tagged` | Scanned successfully, metadata written | ✅ |
| `scanned-no-match` | Scanned, but no AcoustID/MusicBrainz match | ⚠️ |
| `file-changed` | File modified since last scan (hash mismatch) | 🔄 |

**Key Functions:**

| Function | Description |
|----------|-------------|
| `initializeDatabase()` | Creates DB connection, ensures schema exists |
| `closeDatabase()` | Closes DB connection on app quit |
| `generateFileHash(path)` | Creates SHA256 hash for change detection |
| `getFileScanStatus(path)` | Returns scan status for a single file |
| `getBatchScanStatus(paths)` | Returns status map for multiple files |
| `markFileScanned(path, mbid, hasMetadata)` | Records scan result |
| `getUnscannedFiles(paths)` | Filters to files needing scan |
| `getScanStatistics()` | Returns {total, withMetadata, withoutMetadata} |
| `cleanupOrphanedEntries()` | Removes entries for deleted files |
| `clearCache()` | Wipes entire cache (for reset) |

### Music Scanner

Scans directories recursively and extracts metadata from audio files.

**Supported Formats:**
`.mp3`, `.flac`, `.wav`, `.m4a`, `.aac`, `.ogg`, `.opus`, `.wma`, `.aiff`, `.mp4`, `.m4p`, `.amr`

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Music Scanning Flow                          │
│                                                                     │
│  scanMusicFiles(directoryPath)                                      │
│       │                                                             │
│       ▼                                                             │
│  scanDirectory(dirPath)  ← Recursive                               │
│       │                                                             │
│       ├──► Is Directory? → Recurse into subdirectory               │
│       │                                                             │
│       └──► Is File with music extension?                           │
│                 │                                                   │
│                 ▼                                                   │
│            parseFile(fullPath)  ← music-metadata library           │
│                 │                                                   │
│                 ▼                                                   │
│            Extract: title, artist, album, duration, albumArt       │
│                 │                                                   │
│                 ▼                                                   │
│            Push to musicFiles[]                                     │
│                                                                     │
│  Return: MusicFile[]                                                │
└─────────────────────────────────────────────────────────────────────┘
```

### YouTube Downloader

```
┌─────────────────────────────────────────────────────────────────────┐
│                      YouTube Download Flow                          │
│                                                                     │
│  downloadYouTubeAudio(options)                                      │
│       │                                                             │
│       ▼                                                             │
│  Check rate limiting (10s delay between downloads)                 │
│       │                                                             │
│       ▼                                                             │
│  getYtDlpWrap()                                                     │
│       │                                                             │
│       ├──► Binary exists? → Use it                                 │
│       │                                                             │
│       └──► Binary missing? → Download from GitHub                  │
│                                                                     │
│       ▼                                                             │
│  getVideoTitle(url)  → Send title to renderer                      │
│       │                                                             │
│       ▼                                                             │
│  ytDlp.exec([...args])                                              │
│       │                                                             │
│       ├──► --extract-audio                                         │
│       ├──► --audio-format mp3                                      │
│       ├──► --embed-thumbnail                                       │
│       └──► --add-metadata                                          │
│                                                                     │
│  Return: { success, filePath, title }                              │
└─────────────────────────────────────────────────────────────────────┘
```

### System Tray

```
┌─────────────────────────────────────────────────────────────────────┐
│                         System Tray Menu                            │
│                                                                     │
│  ┌─────────────────────────────────┐                                │
│  │  🎵 Music Sync App              │  ← Tooltip                    │
│  ├─────────────────────────────────┤                                │
│  │  Show / Hide                    │  ← Toggle window visibility   │
│  │  ─────────────                  │                                │
│  │  Play / Pause                   │  ← Dynamic based on isPlaying │
│  │  ─────────────                  │                                │
│  │  Quit                           │  ← Exit application           │
│  └─────────────────────────────────┘                                │
│                                                                     │
│  Click tray icon → Toggle window visibility                        │
└─────────────────────────────────────────────────────────────────────┘
```

### Settings Persistence

Stores user settings in a JSON file.

**Storage Location:**
- Windows: `%APPDATA%/music-sync-app/app-config.json`
- macOS: `~/Library/Application Support/music-sync-app/app-config.json`
- Linux: `~/.config/music-sync-app/app-config.json`

### Binary Manager

Manages external binaries (yt-dlp) with automatic download and error recovery.

**Error Handling:**

| Error Code | Meaning | Action |
|------------|---------|--------|
| `EFTYPE` | File exists but wrong format/corrupted | Auto-delete, show as "Missing" |
| `EACCES` | Permission denied | Auto-delete, show as "Missing" |
| `ENOENT` | File not found | Show as "Missing" |

Binary is considered "installed" only if the file exists AND can execute successfully. Corrupted binaries are automatically deleted and marked as "Missing".

---

## Renderer Process

The **Renderer Process** is your React application - the UI that users see and interact with.

### Main Component: `App.tsx`

The orchestrator that combines all hooks and components.

```
┌─────────────────────────────────────────────────────────────────────┐
│                            App.tsx                                  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  Hooks                                                        │  │
│  │  ─────                                                        │  │
│  │  useMusicLibrary() → musicFiles, loading, sortBy, scanFolder  │  │
│  │  useAudioPlayer() → playSong, togglePlayPause, seek, volume   │  │
│  │  useSongScanner() → scanBatch, progress, cancelBatchScan      │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  Layout                                                       │  │
│  │  ──────                                                       │  │
│  │  <TitleBar />                    ← Custom window controls     │  │
│  │  <Sidebar />                     ← Library filtering          │  │
│  │  <DownloadButton />              ← YouTube download trigger   │  │
│  │  <SongList />                    ← Display music files        │  │
│  │  <PlaybackBar />                 ← Controls, seek, volume     │  │
│  │  <Settings />                    ← Settings modal             │  │
│  │  <DownloadNotification />        ← Active download progress   │  │
│  │  <NotificationToast />           ← Success/error messages     │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### UI Components

| Component | Purpose |
|-----------|---------|
| **`TitleBar.tsx`** | Custom draggable title bar for frameless window; listens for window state changes to toggle maximize/restore icon |
| **`Sidebar.tsx`** | Derives artist/album facets from library, renders filters with active selection |
| **`SongList.tsx`** | Displays songs with metadata, duration, album art, scan status indicators; handles play selection and per-song scan actions |
| **`PlaybackBar.tsx`** | Shows current track info/art, playback controls, seek bar, and volume slider |
| **`DownloadButton.tsx`** | Accepts YouTube URL, triggers download IPC, disables during active download |
| **`DownloadNotification.tsx`** | Floating banner for active download progress/title |
| **`NotificationToast.tsx`** | General-purpose toasts (success/warning/info/error) with auto-dismiss |
| **`Settings.tsx`** | Modal for folder selection, binary status, platform info, and batch scan |

### Custom Hooks

#### `useAudioPlayer.ts` - Audio Playback

Manages all audio state using **Howler.js**.

**State:**
- `currentSound` - The Howler instance
- `playingIndex` - Index in musicFiles array
- `isPlaying` - Is audio playing?
- `currentTime` / `duration` - Position tracking
- `volume` - Volume level (0.0 - 1.0)
- `shuffle` - Whether random playback is enabled
- `repeatMode` - `off | all | one`

**Actions:**
- `playSong(file, index)` - Create Howl, start playback
- `togglePlayPause()` - Pause/Resume
- `playNext()` / `playPrevious()` - Navigate playlist
- `toggleShuffle()` - Enable/disable random track selection
- `cycleRepeatMode()` - Cycle Off → Repeat All → Repeat One
- `seek(time)` - Jump to position
- `setVolume(volume)` - Adjust volume

**Playback Behaviors:**
- **Shuffle:** `playNext()` chooses a random different track; history is tracked so `playPrevious()` steps back through shuffled selections.
- **Repeat All:** Auto-advance from the last track wraps to the first.
- **Repeat One:** Auto-advance replays the current track.

#### `useMusicLibrary.ts` - Library Management

Manages the music file collection and sorting.

**State:**
- `musicFiles` - Raw array of all music files
- `sortedMusicFiles` - Memoized sorted array
- `selectedFolder` - Currently selected music folder path
- `loading` / `error` - Loading and error states

**Key Functions:**
- `scanFolder(folderPath)` - Scan entire directory and replace all files
- `updateSingleFile(filePath)` - Update metadata for a single file in-place
- `setSortBy(option)` - Change sort order (title, artist, track, dateAdded)

**In-Place Update Flow:**

```
updateSingleFile(filePath)
       │
       ▼
window.electronAPI.readSingleFileMetadata(filePath)
       │
       ▼
Main process reads fresh metadata from file
       │
       ▼
setMusicFiles(prev => prev.map(file => 
  file.path === filePath ? updatedFile : file
))
       │
       ▼
React re-renders only the changed song tile
```

**Benefits of In-Place Updates:**
- ✅ No full library refresh (faster)
- ✅ Preserves scroll position
- ✅ Song stays in visual position
- ✅ Smooth UI updates without flickering

#### `useSongScanner.ts` - Batch Scanning

Manages batch scan queue with progress tracking and cancellation.

```
┌─────────────────────────────────────────────────────────────┐
│  Settings → "Scan X Unscanned Songs" Button                 │
│       │                                                      │
│       ▼                                                      │
│  handleScanAll()                                             │
│       │                                                      │
│       ├──► Filter to unscanned files                        │
│       ├──► scanBatch(unscannedFiles)                        │
│       │                                                      │
│       ▼                                                      │
│  For each file:                                             │
│       │                                                      │
│       ├──► Update BatchScanProgress (X of Y)                │
│       ├──► scanSong(file) with rate limiting                │
│       ├──► Update scan status in cache                      │
│       ├──► Show toast notification                          │
│       ├──► onUpdateSingleFile(file.path)  ← In-place update│
│       └──► waitBetweenSongs()                               │
│                                                              │
│  User can cancel via ✕ button                               │
│                                                              │
│  On Complete: Show summary toast                            │
└─────────────────────────────────────────────────────────────┘
```

### Utilities

| Utility | Purpose |
|---------|---------|
| **`pathResolver.ts`** | Normalizes OS paths to `file:///` URLs for Howler/Electron playback |
| **`sortMusicFiles.ts`** | Pure sorting helpers for title, artist, track, date added |
| **`fingerprintGenerator.ts`** | IPC wrapper for Main Process fpcalc fingerprinting with circuit breaker |
| **`acoustidClient.ts`** | Calls AcoustID API with rate limiting |
| **`musicbrainzClient.ts`** | Queries MusicBrainz, scores releases, generates cover-art URL fallbacks |

### Toast Notification System

**Notification Types:**

| Type | Icon | Color | Use Case |
|------|------|-------|----------|
| `success` | ✓ | Green | Metadata tagged successfully |
| `warning` | ⚠ | Orange | Cover art not found (but metadata written) |
| `info` | ℹ | Blue | No match found / No metadata available |
| `error` | ✕ | Red | Write failed / Scan error |

**Toast Behavior:**
- Auto-dismisses after 3 seconds
- Positioned in bottom-right corner
- Includes close button for manual dismissal
- Fade-in/fade-out animations

---

## IPC Communication

Handlers are organized into **modular files** for better maintainability.

### Handler Structure

```
electron/ipc/
├── handlers.ts              # Main entry - imports and registers all modules
└── modules/
    ├── musicHandlers.ts     # Music file operations
    ├── apiHandlers.ts       # External API operations
    ├── youtubeHandlers.ts   # YouTube download operations
    ├── systemHandlers.ts    # Window & settings operations
    ├── cacheHandlers.ts     # Metadata cache operations
    └── fingerprintHandlers.ts # Audio fingerprinting (fpcalc)
```

### All IPC Endpoints

| Module | Handler | Type | Purpose |
|--------|---------|------|---------|
| **musicHandlers** | `scan-music-folder` | invoke | Scan directory for music files |
| | `select-music-folder` | invoke | Open folder selection dialog |
| | `read-file-buffer` | invoke | Read file for fingerprinting |
| | `read-single-file-metadata` | invoke | Read metadata for a single file |
| | `write-cover-art` | invoke | Embed cover art in audio file |
| | `write-metadata` | invoke | Write all metadata to audio file |
| **apiHandlers** | `lookup-acoustid` | invoke | Query AcoustID API |
| | `lookup-musicbrainz` | invoke | Query MusicBrainz API |
| | `download-image` | invoke | Download cover art image |
| | `download-image-with-fallback` | invoke | Download cover art with fallback URLs |
| **youtubeHandlers** | `download-youtube` | invoke | Download audio from YouTube |
| | `get-binary-statuses` | invoke | Get status of yt-dlp binary |
| **systemHandlers** | `window-minimize` | on | Minimize window |
| | `window-maximize` | on | Toggle maximize/restore |
| | `window-close` | on | Close window |
| | `playback-state-changed` | on | Update tray menu play/pause |
| | `window-visibility-changed` | on | Update tray menu visibility |
| | `get-settings` | invoke | Get stored settings from disk |
| | `save-settings` | invoke | Save settings to disk |
| | `select-download-folder` | invoke | Open folder picker for downloads |
| | `get-platform-info` | invoke | Get process.platform and arch |
| **cacheHandlers** | `cache-get-file-status` | invoke | Get scan status for a file |
| | `cache-mark-file-scanned` | invoke | Record scan result in database |
| | `cache-get-batch-status` | invoke | Get status for multiple files |
| | `cache-get-unscanned-files` | invoke | Filter to unscanned files |
| | `cache-get-statistics` | invoke | Get total/tagged/untagged counts |
| | `cache-get-entry` | invoke | Get full cache entry for file |
| | `cache-cleanup-orphaned` | invoke | Remove entries for deleted files |
| | `cache-clear` | invoke | Clear entire cache (reset) |
| **fingerprintHandlers** | `generate-fingerprint` | invoke | Generate AcoustID fingerprint using fpcalc |
| | `fingerprint-check-ready` | invoke | Check if fpcalc is installed |
| | `fingerprint-ensure-ready` | invoke | Download fpcalc if missing |

### Renderer Type Safety

`src/electron.d.ts` provides TypeScript definitions for `window.electronAPI`. It is **compile-time only** and doesn't enforce runtime checks. Keep it in sync with `preload.ts` to avoid runtime errors.

---

## Core Flows

### App Startup

1. `app.whenReady()` → `registerIpcHandlers()` → `setupWindowEvents()` → `createWindow()` → `createTray()`
2. Removes menu, registers devtools shortcut, loads renderer (dev: `http://localhost:5173`, prod: `file://…/index.html`)

### Renderer Boot

1. `App.tsx` mounts → hooks initialize (`useMusicLibrary`, `useAudioPlayer`, `useSongScanner`)
2. IPC listeners attach (download progress/title, binary progress, window-state, tray play/pause)
3. UI renders title bar, sidebar, list, playback bar, settings, notifications

### Library Scan

1. User selects folder → `select-music-folder` (dialog) → path stored in settings
2. `scan-music-folder` invokes `musicScanner` → returns `MusicFile[]` with metadata/art
3. `useMusicLibrary` sets state, `sortMusicFiles` memoizes ordering; cache statuses fetched for scan indicators

### Playback

1. Click song → `useAudioPlayer.playSong` builds `Howl` with `file:///` URL
2. `onload` sets duration; interval updates current time unless seeking; `onend` advances (respecting shuffle/repeat)
3. Playback state sent to main (`playback-state-changed`) to sync tray menu

### Fingerprint + Tag (Single Song)

Fingerprinting now runs entirely in the **Main Process** using the `fpcalc` binary (Chromaprint CLI).
This avoids browser WASM memory limitations and enables unlimited batch processing.

```
RENDERER                         MAIN PROCESS
────────                         ────────────
User clicks 🔍 button
       │
       ├──► Check scanStatus from cache
       │    ('scanned-tagged'? → Skip)
       │
       ▼
generateFingerprint(filePath)
       │
       ▼
IPC: 'generate-fingerprint' ─────► fpcalcManager.generateFingerprintWithFpcalc()
                                        │
                                        ▼
                                   execFile('fpcalc', ['-json', filePath])
                                        │
                                        ▼
                                   fpcalc runs as subprocess (no memory limits!)
                                        │
                                        ▼
                                   Parse JSON: { fingerprint, duration }
                                        │
◄────────────────────────────── { success, fingerprint, duration }
       │
       ▼
lookupAcoustid(fp, duration) ────► axios.post(AcoustID API)
                                        │
◄────────────────────────────── { mbid } or null
       │
       ├──► null? → markFileScanned(path, null, false) → Show ⚠️
       │
       └──► Continue with MBID...
       │
       ▼
lookupMusicBrainz(mbid) ─────────► axios.get(MusicBrainz API)
                                        │
◄────────────────────────────── Metadata (title, artist, album)
       │
       ▼
downloadImageWithFallback() ─────► Try multiple URLs until success
                                        │
◄────────────────────────────── { success, url }
       │
       ▼
writeMetadata(filePath, data) ───► taglib-wasm writes to file
       │
       ▼
cacheMarkFileScanned() ──────────► SQLite INSERT/REPLACE
       │
       ▼
readSingleFileMetadata() ────────► parseFile() + extract metadata
                                        │
◄────────────────────────────── Updated MusicFile
       │
       ▼
Update file in-place in UI (no full refresh, no jumping)
```

---

## External API Integration

### Rate Limiting

API calls are rate-limited to respect external service limits.

| API | Limit | Our Delay | Safety Margin |
|-----|-------|-----------|---------------|
| **AcoustID** | 3 req/sec | 500ms | ~2 req/sec |
| **MusicBrainz** | 1 req/sec | 1100ms | Buffer for latency |
| **Cover Art Archive** | 1 req/sec | 1100ms | Same as MusicBrainz |
| **Between Songs** | N/A | 500ms | Prevent API hammering |

### Cover Art Fallback System

The Cover Art Archive often returns 404 for specific releases. The app tries multiple URLs in priority order:

```
MusicBrainz returns releases: [Release A, Release B, Release C]

getCoverArtUrls() generates URLs in priority order:

  1. /release/A/front-250  ─── 200 OK? ─── Save & Done!
              │
            404?
              │
  2. /release/B/front-250  ─── 200 OK? ─── Save & Done!
              │
            404?
              │
  3. /release/C/front-250  ─── 200 OK? ─── Save & Done!
              │
            404?
              │
  4. /release/A/front-500  ─── Higher quality fallback
              │
            404?
              │
  5. /release/A/front      ─── Original size fallback
              │
            404?
              │
  6. /release-group/X/front-250 ─ Release group fallback
              │
            404?
              │
  7. All failed! No cover art
```

**URL Priority:**
1. **250px front cover** for each release (best quality/size ratio)
2. **500px front cover** for each release (higher quality)
3. **Original size** for each release (largest)
4. **Release group** covers (some albums only have art at group level)

### Release Selection System

MusicBrainz returns ALL releases containing a recording, including compilations, soundtracks, and remasters. The app uses a scoring system to select the most likely **original release**.

**Scoring Algorithm:**

| Factor | Score Impact |
|--------|--------------|
| **Official** status | +100 |
| **Promotion** status | +20 |
| **Album** primary type | +50 |
| **Single** primary type | +40 |
| **EP** primary type | +30 |
| **Compilation** secondary type | -200 |
| **Soundtrack** secondary type | -150 |
| **Remix** secondary type | -100 |
| **DJ-mix** secondary type | -100 |
| **Live** secondary type | -50 |
| **Earlier release date** | +0 to +50 |

### fpcalc Binary Manager (Audio Fingerprinting)

Audio fingerprinting uses the **fpcalc** binary (official Chromaprint CLI tool) running in the Main Process as a subprocess. This architecture was chosen over the previous WASM-based approach to eliminate memory limitations.

**Why fpcalc instead of WASM?**

| Aspect | WASM (Previous) | fpcalc (Current) |
|--------|-----------------|------------------|
| **Memory Limit** | 2GB hard limit (browser constraint) | **No limit** (native process) |
| **Batch Processing** | Fails after ~30-50 files | **Unlimited files** |
| **UI Blocking** | Runs in Renderer (can freeze UI) | **Separate process** (non-blocking) |
| **Error Recovery** | Complex reset logic needed | Simple process exit/restart |
| **Binary Size** | Included in app bundle | Downloaded on demand (~2MB) |

**Binary Storage Location:**
- Windows: `%APPDATA%/music-sync-app/fpcalc-binary/fpcalc.exe`
- macOS: `~/Library/Application Support/music-sync-app/fpcalc-binary/fpcalc`
- Linux: `~/.config/music-sync-app/fpcalc-binary/fpcalc`

**Platform-Specific Downloads:**

| Platform | Architecture | Download Source |
|----------|-------------|-----------------|
| **Windows** | x64 | `chromaprint-fpcalc-1.5.1-windows-x86_64.zip` |
| **macOS** | x64 | `chromaprint-fpcalc-1.5.1-macos-x86_64.tar.gz` |
| **macOS** | ARM64 (M1/M2) | `chromaprint-fpcalc-1.5.1-macos-arm64.tar.gz` |
| **Linux** | x64 | `chromaprint-fpcalc-1.5.1-linux-x86_64.tar.gz` |

Binaries are downloaded from the official [Chromaprint GitHub releases](https://github.com/acoustid/chromaprint/releases).

**Fingerprint Generation Flow:**

```
┌─────────────────────────────────────────────────────────────────────┐
│  MAIN PROCESS                                                       │
│                                                                     │
│  generateFingerprintWithFpcalc(filePath)                            │
│       │                                                             │
│       ├──► Check if fpcalc exists → Download if missing            │
│       │                                                             │
│       ▼                                                             │
│  execFile('fpcalc', ['-json', filePath])                            │
│       │                                                             │
│       ├──► fpcalc runs as SEPARATE OS PROCESS                      │
│       │    • No memory sharing with Electron                        │
│       │    • 60 second timeout for long files                       │
│       │    • 10MB buffer for large fingerprints                     │
│       │                                                             │
│       ▼                                                             │
│  Parse stdout JSON: { fingerprint: "...", duration: 180 }           │
│       │                                                             │
│       ▼                                                             │
│  Return { success: true, fingerprint, duration }                    │
└─────────────────────────────────────────────────────────────────────┘
```

**Key Functions (fpcalcManager.ts):**

| Function | Purpose |
|----------|---------|
| `getFpcalcPath()` | Get platform-specific binary path |
| `isFpcalcInstalled()` | Check if binary exists and is executable |
| `downloadFpcalc(onProgress)` | Download and extract binary from GitHub |
| `ensureFpcalc()` | Download if missing, return when ready |
| `generateFingerprintWithFpcalc(path)` | Run fpcalc and parse JSON output |

**Error Handling:**

| Error | Handling |
|-------|----------|
| Binary not found | Auto-download on first use |
| Execution timeout | Return null after 60 seconds |
| Process error | Log error, return null (circuit breaker still applies) |
| Unsupported platform | Log error, fingerprinting disabled |

---

## Security Architecture

### Process Isolation (`contextBridge`)

We strictly enforce **Context Isolation** to prevent the Renderer from directly accessing Node.js primitives.

- **Renderer Context:**
  - Has **no** access to `require()`, `process`, or `fs`
  - Can only communicate via `window.electronAPI` defined in `preload.ts`
- **Preload Script:**
  - Acts as a privileged intermediary
  - Exposes only safe, typed functions
  - Sanitizes IPC inputs before passing to Main

### Local File Access & `webSecurity`

**Current Trade-off:** The application sets `webSecurity: false` in `window.ts`.

```typescript
webPreferences: {
  webSecurity: false, // Allows file:// access
  allowRunningInsecureContent: true
}
```

**Rationale:**
- **Requirement:** `Howler.js` and `<img>` tags need to load local audio/image files
- **Mitigation:**
  - Remote content is strictly limited (no remote sites or 3rd party JavaScript)
  - External images are downloaded to local storage before display
  - `NodeIntegration` remains **disabled**

### IPC Security

- **Channel Whitelisting:** Only specific, hardcoded channels are exposed
- **Payload Validation:** Handlers validate paths for basic sanity checks

---

## Cross-Platform Strategy

### File Path Normalization

- **Problem:** Browsers expect standard URLs, but paths differ between OS
- **Solution (`pathResolver.ts`):**
  - Detects OS platform
  - Handles Windows drive letters (e.g., `C:\` → `file:///C:/`)
  - Ensures consistent media loading

### Window Controls

- **macOS:** Uses `titleBarStyle: 'hidden'` for native "Traffic Lights"
- **Windows/Linux:** Uses `frame: false` with custom DOM-based controls

### Binary Management (`yt-dlp`)

| Platform | Arch | Binary Name |
|----------|------|-------------|
| **Windows** | x64 | `yt-dlp.exe` |
| **Windows** | arm64 | `yt-dlp_win_arm64.exe` |
| **macOS** | x64 | `yt-dlp_macos` |
| **macOS** | arm64 | `yt-dlp_macos_arm64` |
| **Linux** | x64 | `yt-dlp_linux` |
| **Linux** | arm64 | `yt-dlp_linux_arm64` |

---

## Key Design Patterns

1. **Custom Hooks** - Encapsulate complex logic (`useAudioPlayer`, `useMusicLibrary`, `useSongScanner`)
2. **Memoization** - `useMemo` for sorted music files
3. **Modular IPC Handlers** - Split by feature for maintainability
4. **Cleanup Functions** - All IPC listeners return cleanup functions
5. **Rate Limiting** - Delays between API calls to respect service limits
6. **Path Normalization** - Cross-platform file:// URL generation
7. **SQLite Caching** - Persistent scan tracking with file change detection
8. **Hash-Based Change Detection** - SHA256(path+size+mtime) for detecting file modifications
9. **Fallback URL Strategy** - Try multiple cover art URLs sequentially
10. **Non-Blocking Notifications** - Toast notifications without interrupting workflow
11. **Release Scoring** - Prioritize original albums over compilations
12. **Batch Processing** - Process multiple files with progress tracking and cancellation
13. **Graceful Error Recovery** - Auto-delete corrupted binaries, handle API failures
14. **Circuit Breaker** - Stop fingerprinting after consecutive failures
15. **Subprocess Fingerprinting** - Run fpcalc as separate process to avoid memory limits
16. **On-Demand Binary Download** - Download platform-specific binaries (yt-dlp, fpcalc) on first use
17. **In-Place Metadata Updates** - Update single file without full library refresh

---

## Known Limitations & Future Work

- **Library UX:** Search bar added; no multi-select for bulk actions yet.
- **Downloads:** No download queue/history; single-link flow with fixed delay.
- **Cover art management:** No manual upload; downloaded art auto-cleans after ~30 days.
- **Incremental updates:** No file-system watch; rescans are manual.
- **Accessibility/shortcuts:** No renderer keyboard shortcuts; limited accessibility.
- **Testing/observability:** No automated tests; limited structured logging.
- **ARM64 Support:** fpcalc not available for Windows ARM64 or Linux ARM64 platforms.

### Proposed Improvements (v2.0)

1. **Indexed Database Layer** - Full ORM (Prisma/Kysely) for complex queries without re-scanning
2. **Streaming I/O for Cover Art** - Use Node.js Streams for large FLAC files
3. **ARM64 Fingerprinting** - Compile fpcalc for ARM64 platforms

---

## Running the App

### Development

```bash
npm run dev
```

### Production Build

```bash
npm run build
```
