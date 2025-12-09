# Music Sync App - Architecture Documentation

## Overview

This is an **Electron + React + TypeScript** desktop music player application. It allows users to:

- Browse and play local music files
- Download music from YouTube using `yt-dlp`
- Control playback from the system tray
- Identify songs using audio fingerprinting (AcoustID + MusicBrainz)
- Custom frameless window with a soft blue title bar
- Filter library by artist/album via sidebar

---

## What is Electron? (For Beginners)

**Electron** is a framework that lets you build desktop applications using web technologies (HTML, CSS, JavaScript). It combines:

- **Chromium** (the browser engine behind Chrome) → Renders your UI
- **Node.js** (JavaScript runtime) → Gives access to system APIs

This means you can create a desktop app that looks like a website but can access files, show system notifications, and run in the background.

### Electron's Two-Process Architecture

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

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Runtime** | Electron 39 | Desktop app framework |
| **Frontend** | React 18 + TypeScript | UI components |
| **Build Tool** | Vite 7 | Fast dev server & bundling |
| **Audio Playback** | Howler.js | Cross-platform audio |
| **Metadata** | music-metadata | Extract ID3 tags & album art |
| **YouTube** | yt-dlp-wrap | Download audio from YouTube |
| **Audio Fingerprinting** | @unimusic/chromaprint (WASM) | Generate audio fingerprints (renderer-thread, reset per file) |
| **Tag Writing** | taglib-wasm | Write cover art to files |
| **Database** | better-sqlite3 | SQLite metadata cache |
| **Sliders** | rc-slider | Seek bar & volume control |
| **Scrollbars** | overlayscrollbars-react | Custom themed scrollbars |
| **HTTP** | axios | API requests |
| **Styling** | CSS (no framework) | Custom responsive design |

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
│   ├── metadataCache.ts         # SQLite database for scan tracking
│   └── ipc/
│       ├── handlers.ts          # Main IPC registration (imports modules)
│       └── modules/             # Modular IPC handlers
│           ├── musicHandlers.ts     # Folder scanning, cover art writing
│           ├── apiHandlers.ts       # AcoustID, MusicBrainz, image download
│           ├── youtubeHandlers.ts   # YouTube download, binary status
│           ├── systemHandlers.ts    # Window controls, settings, platform
│           └── cacheHandlers.ts     # Metadata cache operations
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
│   │   └── useMusicLibrary.ts   # Library management
│   └── utils/
│       ├── sortMusicFiles.ts    # Sorting utilities
│       ├── fingerprintGenerator.ts  # Audio fingerprint generation
│       ├── acoustidClient.ts    # AcoustID API client
│       └── musicbrainzClient.ts # MusicBrainz API client
│
├── vite.config.ts               # Vite + Electron build configuration
├── package.json                 # Dependencies and scripts
└── index.html                   # Entry HTML file
```

---

## Main Process Components

The **Main Process** runs in Node.js and handles all system-level operations.

### 1. `electron/main.ts` - Application Entry Point

This is where your app starts. Think of it as the "main()" function of a traditional program.

**What it does:**
1. Removes the default Electron menu bar
2. Registers IPC handlers (sets up communication channels)
3. Sets up keyboard shortcuts (F12 for DevTools)
4. Creates the main window
5. Creates the system tray icon

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

---

### 2. `electron/window.ts` - Window Management

Creates and configures the main BrowserWindow.

**Key Configuration:**

```typescript
win = new BrowserWindow({
  width: 800, height: 700,       // Default size
  minWidth: 450, minHeight: 600, // Minimum size
  frame: false,                   // Remove default window frame
  titleBarStyle: 'hidden',        // macOS-specific
  backgroundColor: '#1a1a1a',     // Background while loading
  webPreferences: {
    preload: path.join(__dirname, 'preload.mjs'),
    webSecurity: false,           // Allow file:// protocol
  },
})
```

---

### 3. `electron/preload.ts` - The Secure Bridge

The preload script securely exposes specific APIs to the renderer via `contextBridge`.

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

---

### 4. `electron/ipc/handlers.ts` - IPC Handler Registration

Handlers are organized into **modular files** for better maintainability.

**Renderer Type Safety (`src/electron.d.ts`)**

- Provides TypeScript definitions for `window.electronAPI` that the renderer uses.
- It is **compile-time only**: it does not enforce runtime checks.
- Keep it in sync with what `preload.ts` exposes and what main-process handlers implement to avoid runtime “function not found” errors.

**Modular Structure:**

```
electron/ipc/
├── handlers.ts              # Main entry - imports and registers all modules
└── modules/
    ├── musicHandlers.ts     # Music file operations
    ├── apiHandlers.ts       # External API operations
    ├── youtubeHandlers.ts   # YouTube download operations
    ├── systemHandlers.ts    # Window & settings operations
    └── cacheHandlers.ts     # Metadata cache operations
```

**Main handlers.ts:**

```typescript
import { registerMusicHandlers } from './modules/musicHandlers'
import { registerApiHandlers } from './modules/apiHandlers'
import { registerYoutubeHandlers } from './modules/youtubeHandlers'
import { registerSystemHandlers } from './modules/systemHandlers'
import { registerCacheHandlers } from './modules/cacheHandlers'

export function registerIpcHandlers() {
  registerMusicHandlers()
  registerApiHandlers()
  registerYoutubeHandlers()
  registerSystemHandlers()
  registerCacheHandlers()
}
```

**All IPC Endpoints by Module:**

| Module | Handler | Type | Purpose |
|--------|---------|------|---------|
| **musicHandlers** | `scan-music-folder` | invoke | Scan directory for music files |
| | `select-music-folder` | invoke | Open folder selection dialog |
| | `read-file-buffer` | invoke | Read file for fingerprinting |
| | `read-single-file-metadata` | invoke | Read metadata for a single file (in-place updates) |
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

---

### 5. `electron/musicScanner.ts` - Music File Scanner

Scans directories recursively and extracts metadata from audio files.

**Supported Formats:**
`.mp3`, `.flac`, `.wav`, `.m4a`, `.aac`, `.ogg`, `.opus`, `.wma`, `.aiff`, `.mp4`, `.m4p`, `.amr`

**Key Functions:**

| Function | Purpose |
|----------|---------|
| `scanMusicFiles(directoryPath)` | Recursively scan directory for all music files |
| `readSingleFileMetadata(filePath)` | Read metadata for a single file (for in-place updates) |

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

┌─────────────────────────────────────────────────────────────────────┐
│              Single File Metadata Read (In-Place Updates)           │
│                                                                     │
│  readSingleFileMetadata(filePath)                                    │
│       │                                                             │
│       ├──► Check file exists                                       │
│       ├──► Verify music extension                                   │
│       │                                                             │
│       ▼                                                             │
│  parseFile(filePath)  ← music-metadata library                     │
│       │                                                             │
│       ▼                                                             │
│  Extract: title, artist, album, duration, albumArt                 │
│       │                                                             │
│       ▼                                                             │
│  Return: MusicFile (single file object)                            │
└─────────────────────────────────────────────────────────────────────┘
```

---

### 6. `electron/youtubeDownloader.ts` - YouTube Downloader

Downloads audio from YouTube using `yt-dlp`.

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

---

### 7. `electron/tray.ts` - System Tray

Creates a system tray icon with a context menu.

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

---

### 8. `electron/settings.ts` - Settings Persistence

Stores user settings in a JSON file.

**Storage Location:**
- Windows: `%APPDATA%/music-sync-app/app-config.json`
- macOS: `~/Library/Application Support/music-sync-app/app-config.json`
- Linux: `~/.config/music-sync-app/app-config.json`

---

### 9. `electron/metadataCache.ts` - SQLite Metadata Cache

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

**Scan Status Types:**

| Status | Description | UI Icon |
|--------|-------------|---------|
| `unscanned` | Not in database or never scanned | 🔍 |
| `scanned-tagged` | Scanned successfully, metadata written | ✅ |
| `scanned-no-match` | Scanned, but no AcoustID/MusicBrainz match | ⚠️ |
| `file-changed` | File modified since last scan (hash mismatch) | 🔄 |

**File Change Detection:**

The cache uses a hash of `filePath + fileSize + modificationTime` to detect file changes:

```typescript
function generateFileHash(filePath: string): string {
  const stats = fs.statSync(filePath)
  const hashInput = `${filePath}:${stats.size}:${stats.mtimeMs}`
  return crypto.createHash('sha256').update(hashInput).digest('hex')
}
```

This ensures:
- File renamed → treated as new file (path changed)
- File modified → hash changes (mtime changed)
- File replaced → hash changes (size or mtime changed)
- File unchanged → hash matches → skip rescan

**Complete Flow Diagram:**

```
┌─────────────────────────────────────────────────────────────────────┐
│                    METADATA CACHE LIFECYCLE                          │
│                                                                     │
│  APP STARTS                                                         │
│       │                                                             │
│       ▼                                                             │
│  initializeDatabase()                                               │
│       │                                                             │
│       ├──► Database exists? → Load existing cache                  │
│       │                                                             │
│       └──► No database? → Create new with schema                   │
│                                                                     │
│  USER SCANS FOLDER                                                  │
│       │                                                             │
│       ▼                                                             │
│  For each music file:                                               │
│       │                                                             │
│       ├──► cacheGetBatchStatus(filePaths)                          │
│       │         │                                                   │
│       │         ▼                                                   │
│       │    Compare fileHash with current file                      │
│       │         │                                                   │
│       │    ┌────┴────┐                                              │
│       │    │         │                                              │
│       │  Match    Mismatch                                          │
│       │    │         │                                              │
│       │    ▼         ▼                                              │
│       │  Check    'file-changed'                                   │
│       │  hasMetadata  or 'unscanned'                               │
│       │    │                                                        │
│       │  ┌─┴─┐                                                      │
│       │  │   │                                                      │
│       │  1   0                                                      │
│       │  │   │                                                      │
│       │  ▼   ▼                                                      │
│       │ '✅' '⚠️'                                                   │
│       │                                                             │
│  USER CLICKS 🔍                                                     │
│       │                                                             │
│       ▼                                                             │
│  Generate fingerprint → Query AcoustID → Query MusicBrainz          │
│       │                                                             │
│       ├──► Success: Write metadata → markFileScanned(path, mbid, true)
│       │                                        │                    │
│       │                                        ▼                    │
│       │                                   Show ✅                   │
│       │                                                             │
│       └──► No match: markFileScanned(path, null, false)            │
│                                        │                            │
│                                        ▼                            │
│                                   Show ⚠️                           │
│                                                                     │
│  APP CLOSES                                                         │
│       │                                                             │
│       ▼                                                             │
│  closeDatabase()  ← Database persists for next session             │
└─────────────────────────────────────────────────────────────────────┘
```

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

---

## Renderer Process Components

The **Renderer Process** is your React application - the UI that users see and interact with.

### 1. `src/App.tsx` - Main React Component

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

---

### 2. `src/hooks/useAudioPlayer.ts` - Audio Playback Hook

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

**Playback behaviors:**
- **Shuffle:** `playNext()` chooses a random different track; history is tracked so `playPrevious()` steps back through shuffled selections.
- **Repeat All:** Auto-advance from the last track wraps to the first.
- **Repeat One:** Auto-advance replays the current track.

---

### 3. `src/hooks/useMusicLibrary.ts` - Library Management Hook

Manages the music file collection and sorting.

**Key Functions:**

| Function | Purpose |
|----------|---------|
| `scanFolder(folderPath)` | Scan entire directory and replace all files |
| `updateSingleFile(filePath)` | Update metadata for a single file in-place |
| `setSortBy(option)` | Change sort order (title, artist, track, dateAdded) |

**State:**
- `musicFiles` - Raw array of all music files
- `sortedMusicFiles` - Memoized sorted array (updates when sortBy changes)
- `selectedFolder` - Currently selected music folder path
- `loading` - Whether a scan is in progress
- `error` - Error message if scan fails

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
Return updated MusicFile object
       │
       ▼
setMusicFiles(prevFiles => 
  prevFiles.map(file => 
    file.path === filePath 
      ? updatedFile  // Replace only this file
      : file         // Keep all others unchanged
  )
)
       │
       ▼
React re-renders only the changed song tile
       │
       ▼
No scroll position loss, no list jumping
```

**Benefits:**
- ✅ No full library refresh (faster)
- ✅ Preserves scroll position
- ✅ Song stays in visual position (doesn't jump when title changes)
- ✅ Smooth UI updates without flickering
- ✅ Better user experience when scanning individual songs

---

## IPC Communication Flows

### Music Folder Selection & Scanning

```
RENDERER                         MAIN PROCESS
────────                         ────────────
User clicks "Select Folder"
       │
       ▼
window.electronAPI
  .selectMusicFolder() ──────────► dialog.showOpenDialog()
                                        │
◄───────────────────────────── folderPath
       │
       ▼
window.electronAPI
  .scanMusicFolder() ────────────► scanMusicFiles(path)
                                        │
◄───────────────────────────── MusicFile[]
       │
       ▼
setMusicFiles(files)
```

### YouTube Download Flow

```
RENDERER                         MAIN PROCESS
────────                         ────────────
User clicks "Download"
       │
       ▼
window.electronAPI
  .downloadYouTube(url, path) ──► downloadYouTubeAudio()
                                       │
onDownloadTitle(title) ◄──────── send 'download-title'
       │
       ▼
Show notification
                                       │
onDownloadProgress() ◄────────── send 'download-progress' (loop)
       │
       ▼
Update progress bar
                                       │
◄──────────────────────────── { success, filePath }
       │
       ▼
Refresh library
Show success toast
```

### Audio Fingerprinting Flow (with Cache)

```
RENDERER                         MAIN PROCESS
────────                         ────────────
User clicks 🔍 button
       │
       ▼
Check scanStatus from cache
       │
       ├──► 'scanned-tagged'? → Skip (show "Already tagged")
       │
       └──► Continue...
       │
       ▼
generateFingerprint(filePath)
       │
       ▼
window.electronAPI
  .readFileBuffer(path) ────────► fs.readFileSync(path)
                                        │
◄─────────────────────────────── Buffer (Uint8Array)
       │
       ▼
ChromaprintModule.process()
       │
       ▼
window.electronAPI
  .lookupAcoustid(fp, duration) ─► axios.post(AcoustID API)
                                        │
◄─────────────────────────────── { mbid } or null
       │
       ├──► null? → markFileScanned(path, null, false)
       │            Show ⚠️
       │
       └──► Continue with MBID...
       │
       ▼
window.electronAPI
  .lookupMusicBrainz(mbid) ─────► axios.get(MusicBrainz API)
                                        │
◄─────────────────────────────── Metadata (title, artist, album, etc.)
       │
       ▼
window.electronAPI
  .downloadImageWithFallback(   ► Try multiple URLs until one succeeds
     coverUrls, path)                   │
                                        │  404? → Try next URL
                                        │
◄─────────────────────────────── { success, url }
       │
       ▼
window.electronAPI
  .writeMetadata(filePath, data) ► taglib-wasm writes to file
                                        │
◄─────────────────────────────── { success }
       │
       ▼
window.electronAPI
  .cacheMarkFileScanned(path, ──► SQLite INSERT/REPLACE
     mbid, true)                        │
                                        ▼
                                   Database updated
       │
       ▼
Update local scanStatuses state
Show ✅
       │
       ▼
onUpdateSingleFile(filePath)  → Read fresh metadata for this file only
       │
       ▼
window.electronAPI
  .readSingleFileMetadata(path) ──► readSingleFileMetadata(path)
                                        │
                                        ▼
                                   parseFile() + extract metadata
                                        │
◄─────────────────────────────── Updated MusicFile
       │
       ▼
Update file in-place in musicFiles array
       │
       ▼
UI updates only this song's tile (no full refresh, no jumping)
```

### In-Place Metadata Updates

When a song is successfully scanned and tagged, the app updates only that specific file's metadata in the UI without refreshing the entire library. This provides a smooth, non-disruptive user experience.

**The Problem (Before):**

Previously, after tagging a song, the app would call `onRefreshLibrary()` which:
1. Rescanned the entire folder
2. Re-sorted all files
3. Caused the list to jump around (especially if title changed alphabetically)
4. Lost scroll position
5. Made it hard to find the song you just tagged

**The Solution:**

Instead of full refresh, the app now uses `updateSingleFile()` which:
1. Reads fresh metadata for only the tagged file
2. Updates that file in-place in the `musicFiles` array
3. React re-renders only the changed song tile
4. Preserves scroll position and visual position
5. No list jumping or flickering

**Implementation Flow:**

```
┌─────────────────────────────────────────────────────────────────────┐
│  User clicks 🔍 on a song                                            │
│       │                                                             │
│       ▼                                                             │
│  Generate fingerprint → AcoustID → MusicBrainz → Write metadata     │
│       │                                                             │
│       ▼                                                             │
│  Metadata written successfully                                       │
│       │                                                             │
│       ▼                                                             │
│  onUpdateSingleFile(filePath)  ← NEW: In-place update              │
│       │                                                             │
│       ├──► IPC: read-single-file-metadata                          │
│       │         │                                                  │
│       │         ▼                                                  │
│       │    Main: readSingleFileMetadata(filePath)                  │
│       │         │                                                  │
│       │         ▼                                                  │
│       │    parseFile() → Extract fresh metadata                     │
│       │         │                                                  │
│       │         ▼                                                  │
│       │    Return: Updated MusicFile                                │
│       │                                                             │
│       ▼                                                             │
│  setMusicFiles(prev => prev.map(file =>                            │
│    file.path === filePath ? updatedFile : file                      │
│  ))                                                                 │
│       │                                                             │
│       ▼                                                             │
│  React re-renders only the changed song tile                       │
│       │                                                             │
│       ▼                                                             │
│  ✅ Song tile updates smoothly                                      │
│  ✅ No scroll position loss                                         │
│  ✅ No list jumping                                                 │
│  ✅ Song stays in visual position                                   │
└─────────────────────────────────────────────────────────────────────┘
```

**Key Components:**

| Component | Role |
|-----------|------|
| `readSingleFileMetadata()` | Main process function to read one file's metadata |
| `read-single-file-metadata` | IPC handler exposing the function |
| `updateSingleFile()` | Hook function that updates state in-place |
| `onUpdateSingleFile` | Prop passed to SongList for individual scans |
| `useSongScanner` | Also uses in-place updates for batch scans |

**When Full Refresh is Still Used:**

- Initial folder scan
- After YouTube download (new file added)
- Manual "Select Music Folder" action
- Settings change that requires rescan

**When In-Place Updates are Used:**

- Individual song scan (clicking 🔍)
- Batch scan (each file updates in-place after tagging)
- Any time metadata is written to an existing file

---

### WASM Fingerprint Memory Management

The `@unimusic/chromaprint` WASM library has memory management limitations that require special handling during batch processing.

**The Problem:**

WASM modules have a fixed memory allocation that doesn't properly clean up between operations. After processing many files (~30-50), the WASM memory becomes exhausted:

```
Error: Failed processing file: memory access out of bounds
    at processAudioFile (index.js)
```

**Mitigation Strategies:**

| Strategy | Implementation | Purpose |
|----------|---------------|---------|
| **Circuit Breaker** | Stop after 3 consecutive errors | Prevent crash loops |
| **File Size Limit** | Skip files > 50MB | Large files exhaust memory faster |
| **Micro Delays** | 100ms before each fingerprint | Allow GC to run |
| **Error Reset** | Reset counter on batch start | Fresh start for each batch |
| **Per-File Reinit** | Reset WASM instance after each file | Release WASM memory aggressively |
| **User Warning** | Notify when scanning 50+ files | Set expectations |

**Implementation:** `src/utils/fingerprintGenerator.ts`

```typescript
// Circuit breaker pattern
let consecutiveErrors = 0
const MAX_CONSECUTIVE_ERRORS = 3

// Skip oversized files
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

// Allow GC time between operations
await smallDelay(100)

// Reset WASM instance after each file to release memory
if (filesSinceInit >= MAX_FILES_BEFORE_RESET) {
  await resetChromaprintModule() // drops module reference, re-imports next call
}
```

**Flow:**

```
┌─────────────────────────────────────────────────────────────────┐
│  generateFingerprint(filePath)                                   │
│       │                                                          │
│       ├──► consecutiveErrors >= 3? → Return null (circuit open) │
│       │                                                          │
│       ├──► File > 50MB? → Return null (too large)               │
│       │                                                          │
│       ├──► await smallDelay(100ms)                              │
│       │                                                          │
│       ├──► processAudioFile(buffer)                             │
│       │         │                                                │
│       │         ├──► Success → Reset errors, return fingerprint │
│       │         │                                                │
│       │         └──► "memory access out of bounds"              │
│       │                   │                                      │
│       │                   └──► consecutiveErrors++              │
│       │                        Return null                       │
│       │                                                          │
│       ├──► filesSinceInit++                                      │
│       │                                                          │
│       ├──► filesSinceInit >= MAX_FILES_BEFORE_RESET?             │
│       │        │                                                 │
│       │        └──► resetChromaprintModule()  // free WASM mem   │
└─────────────────────────────────────────────────────────────────┘
```

**Recommendations for Large Libraries:**

1. Current state resets the WASM module after *every* file to keep memory usage low.
2. Fingerprinting still runs on the renderer thread; long batches can make the UI feel sluggish.
3. Future improvement: move fingerprinting to the main process using the `fpcalc`/chromaprint CLI, or to a Web Worker, to avoid UI blocking and WASM limits.

---

### Cover Art Fallback System

The Cover Art Archive often returns 404 for specific releases. To handle this, the app tries multiple URLs in priority order:

```
┌─────────────────────────────────────────────────────────────────────┐
│  Cover Art Download with Fallback                                   │
│                                                                     │
│  MusicBrainz returns releases: [Release A, Release B, Release C]   │
│                                                                     │
│  getCoverArtUrls() generates URLs in priority order:                │
│                                                                     │
│    1. /release/A/front-250  ─── 200 OK? ─── Save & Done!           │
│                │                                                    │
│              404?                                                   │
│                │                                                    │
│    2. /release/B/front-250  ─── 200 OK? ─── Save & Done!           │
│                │                                                    │
│              404?                                                   │
│                │                                                    │
│    3. /release/C/front-250  ─── 200 OK? ─── Save & Done!           │
│                │                                                    │
│              404?                                                   │
│                │                                                    │
│    4. /release/A/front-500  ─── Higher quality fallback            │
│                │                                                    │
│              404?                                                   │
│                │                                                    │
│    5. /release/A/front      ─── Original size fallback             │
│                │                                                    │
│              404?                                                   │
│                │                                                    │
│    6. /release-group/X/front-250 ─ Release group fallback          │
│                │                                                    │
│              404?                                                   │
│                │                                                    │
│    7. /release-group/X/front ─── All failed! No cover art          │
└─────────────────────────────────────────────────────────────────────┘
```

**Key Functions:**

| Function | Location | Purpose |
|----------|----------|---------|
| `getCoverArtUrls(releases, releaseGroupId)` | `musicbrainzClient.ts` | Generates array of fallback URLs |
| `download-image-with-fallback` | `apiHandlers.ts` | IPC handler that tries URLs sequentially |

**URL Priority:**
1. **250px front cover** for each release (best quality/size ratio)
2. **500px front cover** for each release (higher quality)
3. **Original size** for each release (largest)
4. **Release group** covers (some albums only have art at group level)

---

### Release Selection System

MusicBrainz returns ALL releases containing a recording, including compilations, soundtracks, and remasters. The app uses a scoring system to select the most likely **original release**.

**The Problem:**

```
MusicBrainz returns:
  - "Greatest Hits 2020"     (Compilation)     ❌
  - "Movie Soundtrack"       (Soundtrack)      ❌
  - "Artist - Original Album" (Album)          ✅ ← Want this one
  - "Remix Collection"       (Remix)           ❌
```

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
| **Earlier release date** | +0 to +50 (bonus for older = original) |

**Selection Flow:**

```
┌─────────────────────────────────────────────────────────────────────┐
│  pickBestRelease(releases)                                          │
│       │                                                             │
│       ▼                                                             │
│  For each release:                                                  │
│       │                                                             │
│       ├──► Get release-group.primary-type ("Album", "Single", etc.)│
│       ├──► Get release-group.secondary-types (["Compilation"], etc.)│
│       ├──► Get status ("Official", "Bootleg", etc.)                │
│       ├──► Get date (earlier = more likely original)               │
│       │                                                             │
│       ▼                                                             │
│  Calculate score using factors above                                │
│       │                                                             │
│       ▼                                                             │
│  Sort by score (highest first)                                      │
│       │                                                             │
│       ▼                                                             │
│  Return top-scoring release                                         │
└─────────────────────────────────────────────────────────────────────┘
```

**Console Output Example:**

```
=== Release Selection ===
Top 5 releases by score:
  1. "Thriller" (1982-11-30)
     Type: Album
     Status: Official, Score: 192
  2. "Greatest Hits" (2008-01-01)
     Type: Album + Compilation
     Status: Official, Score: -58
  3. "80s Soundtrack" (1985-05-01)
     Type: Album + Soundtrack
     Status: Official, Score: -11
Selected: "Thriller"
========================
```

**Key Functions:**

| Function | Location | Purpose |
|----------|----------|---------|
| `scoreRelease(release)` | `musicbrainzClient.ts` | Calculates score for a single release |
| `pickBestRelease(releases)` | `musicbrainzClient.ts` | Returns highest-scoring release |

---

### Toast Notification System

Non-blocking toast notifications provide user feedback for scan operations without interrupting the workflow.

**Component:** `NotificationToast.tsx`

**Notification Types:**

| Type | Icon | Color | Use Case |
|------|------|-------|----------|
| `success` | ✓ | Green | Metadata tagged successfully |
| `warning` | ⚠ | Orange | Cover art not found (but metadata written) |
| `info` | ℹ | Blue | No match found / No metadata available |
| `error` | ✕ | Red | Write failed / Scan error |

**Scan Result Notifications:**

```
┌─────────────────────────────────────────────────────────────────────┐
│  Scan Operation Results → Toast Notifications                       │
│                                                                     │
│  ┌─────────────────────┐     ┌─────────────────────────────────┐   │
│  │ Metadata written    │ ──► │ ✓ Tagged: "Song" by Artist      │   │
│  │ successfully        │     │        (success, green)          │   │
│  └─────────────────────┘     └─────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────┐     ┌─────────────────────────────────┐   │
│  │ Cover art 404       │ ──► │ ⚠ No cover art found for "Song" │   │
│  │ (all URLs failed)   │     │        (warning, orange)         │   │
│  └─────────────────────┘     └─────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────┐     ┌─────────────────────────────────┐   │
│  │ No AcoustID match   │ ──► │ ℹ No match found for "file.mp3" │   │
│  │                     │     │        (info, blue)              │   │
│  └─────────────────────┘     └─────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────┐     ┌─────────────────────────────────┐   │
│  │ Write/scan error    │ ──► │ ✕ Scan failed for "file.mp3"    │   │
│  │                     │     │        (error, red)              │   │
│  └─────────────────────┘     └─────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

**Props Flow:**

```
App.tsx
   │
   ├── showToastNotification(message, type)  ← Helper function
   │         │
   │         ▼
   └── <SongList onShowNotification={showToastNotification} />
                    │
                    ▼
              handleGenerateFingerprint()
                    │
                    ├── Success → onShowNotification("Tagged: ...", 'success')
                    ├── No cover → onShowNotification("No cover...", 'warning')
                    ├── No match → onShowNotification("No match...", 'info')
                    └── Error → onShowNotification("Scan failed...", 'error')
```

**Toast Behavior:**
- Auto-dismisses after 3 seconds (configurable via `duration` prop)
- Positioned in bottom-right corner
- Includes close button for manual dismissal
- Fade-in/fade-out animations

---

### Rate Limiting System

API calls are rate-limited to respect external service limits and avoid being blocked.

**Rate Limits (Conservative):**

| API | Limit | Our Delay | Safety Margin |
|-----|-------|-----------|---------------|
| **AcoustID** | 3 req/sec | 500ms | ~2 req/sec |
| **MusicBrainz** | 1 req/sec | 1100ms | Buffer for latency |
| **Cover Art Archive** | 1 req/sec | 1100ms | Same as MusicBrainz |
| **Between Songs** | N/A | 500ms | Prevent API hammering |

**Implementation:** `src/utils/rateLimiter.ts`

```
export const API_DELAYS = {
  ACOUSTID: 500,        // AcoustID allows 3/sec
  MUSICBRAINZ: 1100,    // MusicBrainz requires 1/sec
  COVERART: 1100,       // Cover Art follows MusicBrainz rules
  BETWEEN_SONGS: 500,   // Small delay between batch items
}
```

**Usage Flow:**

```
┌─────────────────────────────────────────────────────────────┐
│  Scan Song                                                   │
│       │                                                      │
│       ├──► Generate Fingerprint (local, no delay)           │
│       │                                                      │
│       ├──► waitForAcoustID()  ← 500ms delay                 │
│       ├──► Query AcoustID API                               │
│       │                                                      │
│       ├──► waitForMusicBrainz()  ← 1100ms delay             │
│       ├──► Query MusicBrainz API                            │
│       │                                                      │
│       ├──► waitForCoverArt()  ← 1100ms delay                │
│       └──► Download Cover Art                               │
└─────────────────────────────────────────────────────────────┘
```

---

### Batch Scan System

Scans entire library with progress tracking and cancellation support.

**Components:**

| Component | Purpose |
|-----------|---------|
| `useSongScanner` hook | Manages scan logic with rate limiting |
| `BatchScanProgress` | Floating progress notification |
| Settings "Scan All" | Initiates batch scan |

**Flow:**

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
│  User can cancel via ✕ button → cancelledRef.current = true │
│                                                              │
│  On Complete:                                                │
│       └──► Show summary toast                               │
│                                                              │
│  Note: No full library refresh needed - each file updated   │
│        in-place as it's scanned                             │
└─────────────────────────────────────────────────────────────┘
```

**Batch Progress UI:**

```
┌──────────────────────────────────┐
│ 🔍 Scanning Library           ✕ │
│                                  │
│          42 of 200               │
│                                  │
│ ████████████░░░░░░░░░░░░░  21%  │
│                                  │
│     Currently: Song Name...      │
└──────────────────────────────────┘
```

**Key Functions:**

| Function | Location | Purpose |
|----------|----------|---------|
| `useSongScanner()` | `src/hooks/useSongScanner.ts` | Hook for scanning with rate limits |
| `scanBatch(files)` | `useSongScanner` | Scan multiple files sequentially |
| `cancelBatchScan()` | `useSongScanner` | Stop ongoing batch scan |
| `handleScanAll()` | `App.tsx` | Initiates scan of unscanned files |

---

### Scan Status Types

Each file in the library has a scan status tracked in SQLite.

**Status Types:**

| Status | Meaning | UI Icon |
|--------|---------|---------|
| `unscanned` | Never been scanned | 🔍 |
| `scanned-tagged` | Scanned, metadata written successfully | ✅ |
| `scanned-no-match` | Scanned, but no match found in AcoustID/MusicBrainz | ⚠️ |
| `file-changed` | Previously scanned, but file was modified (needs rescan) | 🔄 |

**Unscanned File Detection:**

```typescript
// Files needing scan = no status OR unscanned OR file changed
const unscannedFiles = sortedMusicFiles.filter(file => {
  const status = scanStatuses[file.path]
  return !status || status === 'unscanned' || status === 'file-changed'
})
```

**File Change Detection:**

When a file is scanned, a hash is stored: `SHA256(path + size + mtime)`

On next app load:
1. Generate current hash from file stats
2. Compare with stored hash
3. If different → status becomes `'file-changed'` → included in rescan

---

### Binary Manager

Manages external binaries (yt-dlp) with automatic download and error recovery.

**Error Handling:**

| Error Code | Meaning | Action |
|------------|---------|--------|
| `EFTYPE` | File exists but wrong format/corrupted | Auto-delete, show as "Missing" |
| `EACCES` | Permission denied | Auto-delete, show as "Missing" |
| `ENOENT` | File not found | Show as "Missing" |

**Install Status Logic:**

```
Binary "installed" = file exists AND can execute successfully
```

A corrupted binary (exists but can't run) is automatically deleted and marked as "Missing" so users can re-download.

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
9. **Fallback URL Strategy** - Try multiple cover art URLs sequentially until one succeeds
10. **Non-Blocking Notifications** - Toast notifications for scan feedback without interrupting workflow
11. **Release Scoring** - Prioritize original albums over compilations/soundtracks using weighted scoring
12. **Batch Processing** - Process multiple files with progress tracking and cancellation
13. **API Rate Limiting** - Conservative delays between AcoustID, MusicBrainz, and Cover Art API calls
14. **Graceful Error Recovery** - Auto-delete corrupted binaries, handle API failures without crashing
15. **Circuit Breaker** - Stop WASM fingerprinting after consecutive failures to prevent crash loops
16. **WASM Memory Management** - File size limits and micro-delays to mitigate WASM memory exhaustion
17. **In-Place Metadata Updates** - Update single file metadata without full library refresh to preserve scroll position and prevent list jumping
18. **WASM Per-File Reinit** - Reset chromaprint WASM instance after each file to release memory

---

## Known Limitations & Future Work

- **Fingerprinting still on renderer thread:** Even with per-file WASM reset, long batches can make the UI feel sluggish. Best path is to move fingerprinting to a main-process chromaprint/`fpcalc` CLI or a Web Worker.
- **Playback/UX gaps:** No shuffle/repeat, queue/playlist management, or persisted playback/volume state across sessions.
- **Library UX:** Search bar added (title/artist/album); still no multi-select for bulk actions; “dateAdded” now uses file modification time (mtime) for stable ordering.
- **Downloads:** No download queue/history; single-link flow with a fixed inter-download delay; minimal retry/visibility for failures.
- **Cover art management:** No manual upload/fix; downloaded art in `userData/assets` now auto-cleans files older than ~30 days (no UI yet for manual cleanup).
- **Incremental updates:** No file-system watch; rescans are manual.
- **Accessibility/shortcuts:** No renderer keyboard shortcuts (play/pause, next/prev, scan); limited accessibility affordances.
- **Testing/observability:** No automated tests; limited structured logging/telemetry for API and tagging failures.

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

