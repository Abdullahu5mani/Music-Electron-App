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
│   ├── main.tsx                 # React entry point
│   ├── App.tsx                  # App shell (routing, providers)
│   ├── index.css                # Global CSS variables/resets
│   │
│   ├── types/                   # TypeScript definitions
│   │   ├── electron.d.ts        # IPC type definitions
│   │   └── vite-env.d.ts        # Vite environment types
│   │
│   ├── assets/                  # Images, SVGs, fonts
│   │   └── icons/               # App icons and UI graphics
│   │
│   ├── styles/                  # Shared/global styles
│   │   ├── variables.css        # CSS custom properties
│   │   ├── animations.css       # Keyframe animations
│   │   └── components.css       # Shared component styles
│   │
│   ├── components/              # UI Components (feature-based)
│   │   ├── common/              # Reusable UI primitives
│   │   │   ├── Button/
│   │   │   └── NotificationToast/
│   │   │
│   │   ├── layout/              # App structure components
│   │   │   ├── TitleBar/
│   │   │   ├── Sidebar/
│   │   │   └── PlaybackBar/
│   │   │
│   │   ├── library/             # Music library feature
│   │   │   ├── SongList/
│   │   │   └── BatchScanProgress/
│   │   │
│   │   ├── settings/            # Settings feature
│   │   │   └── Settings/
│   │   │
│   │   └── download/            # YouTube download feature
│   │       ├── DownloadButton/
│   │       └── DownloadNotification/
│   │
│   ├── hooks/                   # Custom React Hooks
│   │   ├── useAudioPlayer/
│   │   │   ├── index.ts         # Main hook export
│   │   │   └── useAudioPlayer.ts
│   │   ├── useMusicLibrary/
│   │   └── useSongScanner/
│   │
│   ├── services/                # API/IPC communication layer
│   │   ├── acoustid.ts          # AcoustID API client
│   │   ├── musicbrainz.ts       # MusicBrainz API client
│   │   ├── fingerprint.ts       # Fingerprint generation service
│   │   └── electronBridge.ts    # Wrapper for window.electronAPI
│   │
│   └── utils/                   # Pure utility functions
│       ├── rateLimiter.ts       # API rate limiting
│       ├── sortMusicFiles.ts    # Sorting utilities
│       ├── pathResolver.ts      # Convert paths to file:// URLs
│       └── formatters.ts        # Time, file size formatting
│
├── vite.config.ts               # Vite + Electron build configuration
├── electron-builder.json5       # Packaging configuration
├── package.json                 # Dependencies and scripts
└── index.html                   # Entry HTML file
```

### Component Folder Structure

Each component follows this colocation pattern:

```
SongList/
├── SongList.tsx        # Component logic
├── SongList.css        # Component styles
├── SongList.test.tsx   # Unit tests (optional)
├── SongRow.tsx         # Sub-component (if needed)
└── index.ts            # Re-export for cleaner imports
```

This enables:
- **Import as**: `import { SongList } from '@/components/library/SongList'`
- **Colocated tests**: Tests next to the code they test
- **Encapsulated styles**: CSS scoped to the component

### Source Folder Organization Philosophy

The `src/` folder follows a **feature-based organization** pattern rather than a type-based pattern. This makes it easier to find related code and reduces scattered imports.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    SRC FOLDER ARCHITECTURE                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  src/                                                                    │
│  ├── main.tsx          # Entry point - mounts React to DOM             │
│  ├── App.tsx           # App shell - routes, providers, layout         │
│  ├── App.css           # Global app styles                              │
│  ├── index.css         # CSS reset, variables, global tokens           │
│  │                                                                       │
│  ├── types/            # TypeScript definitions                         │
│  │   ├── electron.d.ts # IPC API types (ElectronAPI interface)         │
│  │   └── vite-env.d.ts # Vite environment types                        │
│  │                                                                       │
│  ├── assets/           # Static assets (images, SVGs, fonts)           │
│  │   ├── trayIcon.svg                                                   │
│  │   ├── playButton.svg                                                 │
│  │   └── ...           # UI icons and graphics                          │
│  │                                                                       │
│  ├── components/       # React UI Components (feature-based)           │
│  │   │                                                                   │
│  │   ├── common/       # Shared, reusable UI primitives                │
│  │   │   └── NotificationToast/   # Toast notifications                │
│  │   │                                                                   │
│  │   ├── layout/       # App structure/shell components                │
│  │   │   ├── TitleBar/           # Custom window title bar             │
│  │   │   ├── Sidebar/            # Navigation sidebar                  │
│  │   │   └── PlaybackBar/        # Bottom playback controls            │
│  │   │                                                                   │
│  │   ├── library/      # Music library feature                         │
│  │   │   ├── SongList/           # Song list display                   │
│  │   │   └── BatchScanProgress/  # Batch scan progress UI              │
│  │   │                                                                   │
│  │   ├── settings/     # Settings feature                              │
│  │   │   └── Settings/           # Settings modal                      │
│  │   │                                                                   │
│  │   └── download/     # YouTube download feature                      │
│  │       ├── DownloadButton/     # Download trigger UI                 │
│  │       └── DownloadNotification/ # Download progress toast           │
│  │                                                                       │
│  ├── hooks/            # Custom React Hooks                             │
│  │   ├── useAudioPlayer.ts    # Audio playback (Howler.js)             │
│  │   ├── useMusicLibrary.ts   # Library state management               │
│  │   └── useSongScanner.ts    # Batch scanning with rate limits        │
│  │                                                                       │
│  ├── services/         # API/IPC Communication Layer                    │
│  │   ├── acoustid.ts      # AcoustID API wrapper                       │
│  │   ├── musicbrainz.ts   # MusicBrainz API wrapper                    │
│  │   └── fingerprint.ts   # Fingerprint generation via IPC             │
│  │                                                                       │
│  └── utils/            # Pure Utility Functions                         │
│      ├── rateLimiter.ts      # API rate limiting logic                 │
│      ├── sortMusicFiles.ts   # Sorting/filtering utilities             │
│      └── pathResolver.ts     # File path to URL conversion             │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Folder Responsibilities

| Folder | Purpose | Examples |
|--------|---------|----------|
| **`types/`** | TypeScript type definitions shared across the app | `ElectronAPI` interface, `ScanStatusType` enum |
| **`assets/`** | Static files bundled by Vite | SVG icons, images, fonts |
| **`components/`** | React UI components organized by feature | `SongList`, `PlaybackBar`, `Settings` |
| **`hooks/`** | Custom React hooks for state/logic reuse | `useAudioPlayer`, `useSongScanner` |
| **`services/`** | External communication (APIs, IPC) | AcoustID client, MusicBrainz client |
| **`utils/`** | Pure functions with no side effects | Sorting, formatting, path conversion |

### Components Subfolder Breakdown

| Subfolder | Purpose | Contains |
|-----------|---------|----------|
| **`common/`** | Reusable UI primitives | `NotificationToast` - generic toast component |
| **`layout/`** | App structure/shell | `TitleBar`, `Sidebar`, `PlaybackBar` |
| **`library/`** | Music library feature | `SongList`, `BatchScanProgress` |
| **`settings/`** | Settings feature | `Settings` modal |
| **`download/`** | YouTube download feature | `DownloadButton`, `DownloadNotification` |

### Services vs Utils

Understanding the distinction:

| Aspect | `services/` | `utils/` |
|--------|-------------|----------|
| **Side Effects** | Yes - makes API/IPC calls | No - pure functions |
| **Async** | Usually async (Promises) | Usually sync |
| **Dependencies** | Uses `window.electronAPI` | No external dependencies |
| **Examples** | `lookupAcoustid()`, `generateFingerprint()` | `sortMusicFiles()`, `formatTime()` |
| **Testability** | Requires mocking | Easily unit tested |

### Import Path Examples

```typescript
// Components - fully qualified path
import { SongList } from './components/library/SongList/SongList'
import { TitleBar } from './components/layout/TitleBar/TitleBar'
import { NotificationToast } from './components/common/NotificationToast/NotificationToast'

// Services - communication layer
import { lookupFingerprint } from './services/acoustid'
import { lookupRecording, pickBestRelease } from './services/musicbrainz'
import { generateFingerprint, generateFingerprintsBatch } from './services/fingerprint'

// Utils - pure functions
import { waitForAcoustID, waitForMusicBrainz } from './utils/rateLimiter'
import { sortMusicFiles } from './utils/sortMusicFiles'
import { pathToFileURL } from './utils/pathResolver'

// Types - TypeScript definitions
import type { ScanStatusType } from './types/electron.d'
import type { MusicFile } from '../electron/musicScanner'

// Hooks - React state logic
import { useAudioPlayer } from './hooks/useAudioPlayer'
import { useSongScanner } from './hooks/useSongScanner'
```

### Why This Structure?

1. **Feature Discoverability**: Related code is grouped together. Looking for download UI? Check `components/download/`.

2. **Reduced Import Complexity**: Components import relative to their location, not jumping across unrelated folders.

3. **Clear Boundaries**: 
   - UI → `components/`
   - State → `hooks/`
   - External calls → `services/`
   - Helpers → `utils/`

4. **Scalability**: Adding a new feature (e.g., "playlists") = add `components/playlists/` and `hooks/usePlaylists.ts`.

5. **Test Colocation**: Tests live next to their code:
   - `services/__tests__/musicbrainz.test.ts`
   - `utils/__tests__/sortMusicFiles.test.ts`

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

### Library Scan (Initial Folder Scan)

The initial library scan happens when the app loads and discovers all music files in the configured folder.

**Current Behavior:** The scan is **blocking** - the UI waits until all files are discovered and metadata is extracted before displaying anything.

**Code Flow:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│  1. APP STARTUP - useMusicLibrary.ts                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  useEffect(() => {                                                       │
│    const loadSavedFolder = async () => {                                │
│      const settings = await window.electronAPI?.getSettings()           │
│      if (settings?.musicFolderPath) {                                   │
│        await scanFolder(settings.musicFolderPath)  ← BLOCKS UI          │
│      }                                                                   │
│    }                                                                     │
│    loadSavedFolder()                                                     │
│  }, [])                                                                  │
│                                                                          │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  2. SCAN FOLDER - useMusicLibrary.ts                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  const scanFolder = async (folderPath: string) => {                     │
│    setLoading(true)                                                     │
│    const files = await window.electronAPI.scanMusicFolder(folderPath)   │
│    ↑                                                                    │
│    │  IPC CALL - Waits for Main Process to return ALL files            │
│    │  UI shows loading spinner until 100% complete                      │
│    setMusicFiles(filesWithDate)                                         │
│    setLoading(false)                                                    │
│  }                                                                       │
│                                                                          │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼  IPC: 'scan-music-folder'
┌─────────────────────────────────────────────────────────────────────────┐
│  3. MAIN PROCESS - musicHandlers.ts                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ipcMain.handle('scan-music-folder', async (_event, folderPath) => {    │
│    return await scanMusicFiles(folderPath)  ← Returns ALL at once       │
│  })                                                                      │
│                                                                          │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  4. MUSIC SCANNER - musicScanner.ts                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  async function scanMusicFiles(directoryPath) {                         │
│    const musicFiles = []                                                │
│    await scanDirectory(directoryPath, musicFiles)                       │
│    return musicFiles  ← Returns only when ALL files processed           │
│  }                                                                       │
│                                                                          │
│  async function scanDirectory(dirPath, musicFiles) {                    │
│    const entries = fs.readdirSync(dirPath)   ← Sync file system call   │
│    for (const entry of entries) {                                       │
│      if (entry.isDirectory()) {                                         │
│        await scanDirectory(fullPath, musicFiles)                        │
│      } else {                                                            │
│        const stats = fs.statSync(fullPath)   ← Sync call               │
│        const parsed = await parseFile(fullPath)  ← Metadata extraction │
│        musicFiles.push({ path, name, metadata, ... })                   │
│      }                                                                   │
│    }                                                                     │
│  }                                                                       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**Key Bottlenecks:**

| Issue | Location | Impact |
|-------|----------|--------|
| All-or-nothing IPC | `scanFolder()` | UI shows nothing until 100% complete |
| Sync file system | `fs.readdirSync()`, `fs.statSync()` | Blocks Node.js event loop |
| Sequential metadata | `parseFile()` in loop | Each file processed one-by-one |
| No streaming | `scanMusicFiles()` | All files buffered before returning |

**Result:** For a folder with 500+ songs, the app appears frozen for 10-30+ seconds on startup.

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

### Parallel Fingerprint Worker Pool

For batch processing, fingerprints are generated in **parallel** using a worker pool that utilizes all available CPU cores.

**Architecture:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     FINGERPRINT WORKER POOL                              │
│                                                                          │
│  numCPUs = os.cpus().length  → 16 (example: 8 cores × 2 threads)        │
│  workerCount = numCPUs - 1   → 15 (leave 1 for UI/system)               │
│                                                                          │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐        ┌─────────┐     │
│  │Worker 1 │ │Worker 2 │ │Worker 3 │ │Worker 4 │  ...   │Worker 15│     │
│  │ fpcalc  │ │ fpcalc  │ │ fpcalc  │ │ fpcalc  │        │ fpcalc  │     │
│  │ song1   │ │ song2   │ │ song3   │ │ song4   │        │ song15  │     │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘        └────┬────┘     │
│       │           │           │           │                   │          │
│       └───────────┴───────────┴───────────┴───────────────────┘          │
│                                    │                                     │
│                                    ▼                                     │
│                    Ordered Results Queue                                 │
│                    [fp1, fp2, fp3, ..., fpN]                            │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**Key Features:**

| Feature | Description |
|---------|-------------|
| **Auto CPU Detection** | `os.cpus().length` detects logical processors |
| **Optimal Worker Count** | Uses `numCPUs - 1` to leave headroom for UI |
| **Slot-Based Logging** | Each worker logs as `[Worker 1]`, `[Worker 2]`, etc. |
| **Ordered Results** | Results returned in original file order, not completion order |
| **Progress Events** | Real-time progress sent to Renderer via IPC events |

**IPC Endpoints:**

| Handler | Purpose |
|---------|---------|
| `generate-fingerprints-batch` | Process multiple files in parallel |
| `fingerprint-get-pool-info` | Get CPU count and worker count |
| `fingerprint-batch-progress` | Event: progress updates during batch |

**Example Log Output:**

```
[FingerprintPool] Initialized with 15 workers (16 CPU cores detected)
[FingerprintPool] Starting batch of 100 files with 15 workers
[Worker 1] Starting: "song1.mp3"
[Worker 2] Starting: "song2.mp3"
...
[Worker 15] Starting: "song15.mp3"
[Worker 3] Complete: "song3.mp3" (1250ms) - Success
[Worker 3] Starting: "song16.mp3"
...
```

### Parallel Metadata Scanner (Initial Library Scan)

When the app launches or a new music folder is selected, the library scan uses **parallel metadata parsing** to dramatically speed up initial load times.

**File:** `electron/parallelMetadataScanner.ts`

**Two-Phase Scan Process:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PARALLEL LIBRARY SCAN                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  PHASE 1: File Discovery (Fast Filesystem Walk)                          │
│  ─────────────────────────────────────────────────                       │
│  • Uses async fs.promises.readdir()                                      │
│  • Recursively walks directories                                         │
│  • Only collects file paths (no parsing)                                 │
│  • Filters by extension (.mp3, .flac, .m4a, etc.)                       │
│  • Very fast: ~50ms for 1000 files                                       │
│                                                                          │
│  PHASE 2: Parallel Metadata Parsing                                      │
│  ─────────────────────────────────────                                   │
│  • Creates N workers (N = CPU cores - 1)                                 │
│  • Each worker pulls jobs from shared queue                              │
│  • Uses music-metadata library to parse tags                             │
│  • Extracts: title, artist, album, year, duration, albumArt             │
│  • Results returned in original file order                               │
│                                                                          │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐                      │
│  │Worker 1 │  │Worker 2 │  │Worker 3 │  │Worker N │                      │
│  │ parse() │  │ parse() │  │ parse() │  │ parse() │                      │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘                      │
│       │            │            │            │                           │
│       ▼            ▼            ▼            ▼                           │
│  ┌─────────────────────────────────────────────────┐                     │
│  │              Shared Job Queue                    │                     │
│  │  [file1, file2, file3, ..., fileN]              │                     │
│  └─────────────────────────────────────────────────┘                     │
│                         │                                                 │
│                         ▼                                                 │
│  ┌─────────────────────────────────────────────────┐                     │
│  │           Results (Original Order)               │                     │
│  │  [MusicFile1, MusicFile2, ..., MusicFileN]       │                     │
│  └─────────────────────────────────────────────────┘                     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**Performance Comparison:**

| Library Size | Sequential (Old) | Parallel (New) | Speedup |
|--------------|------------------|----------------|---------|
| 100 files | ~10 seconds | ~2 seconds | **5x** |
| 500 files | ~50 seconds | ~8 seconds | **6x** |
| 1000 files | ~100 seconds | ~15 seconds | **7x** |

*Note: Actual times depend on disk speed, file complexity, and CPU cores.*

**Key Classes:**

| Class | Purpose |
|-------|---------|
| `ParallelMetadataScanner` | Worker pool for metadata parsing |
| `getParallelScanner()` | Get singleton instance |

**Example Log Output:**

```
[MetadataScanner] Initialized with 15 workers (16 CPU cores)
[MetadataScanner] Starting full scan of: C:/Users/Music
[MetadataScanner] Phase 1: Discovering files...
[MetadataScanner] Found 217 music files in 45ms
[MetadataScanner] Phase 2: Parsing metadata in parallel...
[MetadataScanner] Starting parallel scan of 217 files with 15 workers
[MetadataScanner] Progress: 50/217 (23%)
[MetadataScanner] Progress: 100/217 (46%)
[MetadataScanner] Progress: 150/217 (69%)
[MetadataScanner] Progress: 200/217 (92%)
[MetadataScanner] Progress: 217/217 (100%)
[MetadataScanner] Complete: 217 files in 3250ms (avg 15.0ms/file)
```

**IPC Integration:**

The parallel scanner is invoked by the `scan-music-folder` IPC handler and sends progress updates back to the Renderer:

```typescript
// In musicHandlers.ts
ipcMain.handle('scan-music-folder', async (event, folderPath) => {
  const scanner = getParallelScanner()
  
  // Set up progress callback
  scanner.setProgressCallback((progress) => {
    event.sender.send('scan-progress', progress)
  })
  
  return await scanner.scanDirectory(folderPath)
})
```

**Performance Optimizations:**

To prevent UI freezing after large library scans, several optimizations are applied:

| Optimization | Problem Solved | Implementation |
|--------------|----------------|----------------|
| **Album Art Size Limit** | 200+ songs × 200KB art = 40MB+ IPC payload | Skip art >150KB, show placeholder |
| **Scan Lock** | Multiple simultaneous scans race | Return existing promise if scanning |
| **Main Thread Yield** | UI frozen during array processing | `setTimeout(0)` before state update |

**Album Art Optimization:**

```typescript
const MAX_ALBUM_ART_SIZE = 150 * 1024 // 150KB max

if (picture.data.length <= MAX_ALBUM_ART_SIZE) {
  albumArt = `data:${picture.format};base64,${buffer.toString('base64')}`
} else {
  albumArt = undefined // Placeholder shown in UI
}
```

**Impact:**

| Metric | Before | After |
|--------|--------|-------|
| IPC Payload (200 songs) | ~43MB | ~5-10MB |
| UI Freeze Duration | 3-5 seconds | <1 second |
| Songs with Placeholder Art | 0% | ~5-10% (large covers) |

**Scan Race Condition Prevention:**

When the app starts, multiple components may request a folder scan simultaneously. The scanner prevents this with a lock:

```typescript
async scanDirectory(directoryPath: string): Promise<MusicFile[]> {
  // If already scanning, return the existing promise
  if (this.isScanning && this.currentScanPromise) {
    console.log('[MetadataScanner] Scan already in progress, waiting...')
    return this.currentScanPromise
  }
  
  this.isScanning = true
  this.currentScanPromise = this.performScan(directoryPath)
  // ...
}
```

### Complete Fingerprint → API Flow (Data Journey)

This section explains exactly how audio data flows through the system from file to AcoustID API.

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                              COMPLETE DATA FLOW                                              │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                              │
│  RENDERER PROCESS (React UI)                                                                 │
│  ─────────────────────────────                                                               │
│                                                                                              │
│  1. User clicks "Scan All Unscanned"                                                        │
│     └── useSongScanner.scanBatch([file1, file2, ...])                                       │
│                                                                                              │
│  2. Renderer sends file PATHS (not audio data) via IPC                                      │
│     └── window.electronAPI.generateFingerprintsBatch([                                      │
│           "C:/Music/song1.mp3",                                                             │
│           "C:/Music/song2.mp3",                                                             │
│           ...                                                                                │
│         ])                                                                                   │
│     └── IPC channel: 'generate-fingerprints-batch'                                          │
│                                                                                              │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                              │
│  MAIN PROCESS (Node.js)                                                                      │
│  ──────────────────────                                                                      │
│                                                                                              │
│  3. IPC Handler receives array of file paths                                                │
│     └── fingerprintHandlers.ts: ipcMain.handle('generate-fingerprints-batch', ...)          │
│                                                                                              │
│  4. Worker Pool distributes files to workers                                                │
│     └── fingerprintWorkerPool.ts: FingerprintWorkerPool.processAll(filePaths)               │
│     └── Creates N workers where N = os.cpus().length - 1                                    │
│     └── Each "worker" is a slot that can run one fpcalc process                             │
│                                                                                              │
│  5. For each file, a worker spawns fpcalc subprocess                                        │
│     └── fpcalcManager.ts: generateFingerprintWithFpcalc(filePath)                           │
│     └── execFile('fpcalc.exe', ['-json', 'C:/Music/song1.mp3'])                             │
│                                                                                              │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                              │
│  FPCALC SUBPROCESS (Native Binary)                                                           │
│  ─────────────────────────────────                                                           │
│                                                                                              │
│  6. fpcalc reads and decodes the audio file                                                 │
│     └── Opens file directly from disk (not sent via IPC)                                    │
│     └── Decodes audio using FFmpeg libraries built into fpcalc                              │
│     └── Computes Chromaprint fingerprint from audio waveform                                │
│                                                                                              │
│  7. fpcalc outputs JSON to stdout                                                           │
│     └── { "fingerprint": "AQADtJ...", "duration": 180.5 }                                   │
│     └── Fingerprint is a ~2KB base64-encoded string                                         │
│     └── Duration is in seconds                                                               │
│                                                                                              │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                              │
│  BACK TO MAIN PROCESS                                                                        │
│  ────────────────────                                                                        │
│                                                                                              │
│  8. Main Process parses stdout JSON                                                         │
│     └── result = JSON.parse(stdout)                                                          │
│     └── Returns { fingerprint, duration } to worker pool                                    │
│                                                                                              │
│  9. Worker pool collects all results, preserves original order                              │
│     └── Results stored in memory as array                                                   │
│     └── [{ filePath, success, fingerprint, duration, workerId }, ...]                       │
│     └── ⚠️ NOT persisted to disk - held in RAM only                                         │
│                                                                                              │
│  10. Batch result returned via IPC to Renderer                                              │
│      └── { success: true, results: [...], stats: { totalTimeMs, ... } }                     │
│                                                                                              │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                              │
│  BACK TO RENDERER (API Lookup Phase)                                                         │
│  ────────────────────────────────────                                                        │
│                                                                                              │
│  11. Renderer receives fingerprints array                                                   │
│      └── fingerprintResults = batchResult.results                                           │
│      └── Fingerprints held in memory (JavaScript heap)                                      │
│                                                                                              │
│  12. For EACH file (sequentially, rate-limited):                                            │
│      └── Wait 500ms (AcoustID rate limit)                                                   │
│      └── Call: window.electronAPI.lookupAcoustid(fingerprint, duration)                     │
│                                                                                              │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                              │
│  MAIN PROCESS (API Call)                                                                     │
│  ───────────────────────                                                                     │
│                                                                                              │
│  13. AcoustID API handler makes HTTP request                                                │
│      └── apiHandlers.ts: ipcMain.handle('lookup-acoustid', ...)                             │
│      └── URL: https://api.acoustid.org/v2/lookup?fingerprint=AQADtJ...&duration=180         │
│      └── Response: { results: [{ recordings: [{ id: "mbid-123", title: "..." }] }] }        │
│                                                                                              │
│  14. Returns MBID (MusicBrainz Recording ID) to Renderer                                    │
│      └── { mbid: "380b708e-...", title: "Song Name", artist: "Artist" }                     │
│                                                                                              │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                              │
│  RENDERER → MAIN → MUSICBRAINZ API                                                           │
│  ──────────────────────────────────                                                          │
│                                                                                              │
│  15. Wait 1100ms (MusicBrainz rate limit)                                                   │
│      └── Call: window.electronAPI.lookupMusicBrainz(mbid)                                   │
│                                                                                              │
│  16. Main Process queries MusicBrainz                                                       │
│      └── URL: https://musicbrainz.org/ws/2/recording/{mbid}?fmt=json&inc=...                │
│      └── Returns: { title, artist-credit, releases, release-groups, ... }                  │
│                                                                                              │
│  17. Renderer picks best release using scoring algorithm                                    │
│      └── pickBestRelease(releases) → selects original album over compilations              │
│                                                                                              │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                              │
│  COVER ART + METADATA WRITE                                                                  │
│  ──────────────────────────                                                                  │
│                                                                                              │
│  18. Download cover art via Main Process                                                    │
│      └── window.electronAPI.downloadImageWithFallback(urls, "assets/cover.jpg")             │
│      └── Saves to: %APPDATA%/music-sync-app/assets/cover_xxx.jpg                            │
│                                                                                              │
│  19. Write metadata to audio file                                                           │
│      └── window.electronAPI.writeMetadata(filePath, { title, artist, album, ... })          │
│      └── Uses taglib-wasm in Main Process                                                   │
│      └── Embeds cover art as ID3 picture tag                                                │
│                                                                                              │
│  20. Mark file as scanned in cache                                                          │
│      └── window.electronAPI.cacheMarkFileScanned(filePath, mbid, hasMetadata)               │
│      └── Writes to: %APPDATA%/music-sync-app/metadata-cache.db                              │
│                                                                                              │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Key Storage Locations:**

| Data | Storage | Persistence |
|------|---------|-------------|
| **Fingerprints** | Memory (RAM) only | Temporary - lost when scan completes |
| **fpcalc binary** | `%APPDATA%/music-sync-app/fpcalc-binary/fpcalc.exe` | Permanent |
| **Scan status cache** | `%APPDATA%/music-sync-app/metadata-cache.db` (SQLite) | Permanent |
| **Cover art images** | `%APPDATA%/music-sync-app/assets/*.jpg` | Permanent |
| **Metadata** | Embedded in audio files (ID3/Vorbis tags) | Permanent |

**Why Fingerprints Aren't Persisted:**

1. They're only needed once - to look up the MBID
2. Once we have the MBID, we don't need the fingerprint again
3. The cache stores the MBID, not the fingerprint
4. Regenerating fingerprints is fast (~200ms per file with parallel processing)

**Data Sizes:**

| Item | Typical Size |
|------|--------------|
| Fingerprint string | ~2-4 KB |
| Audio file | 5-50 MB |
| Cover art image | 20-100 KB |
| Cache database | ~50 KB per 1000 files |

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

## Multithreaded Architecture (Complete System Overview)

This section provides a comprehensive overview of all parallel processing systems in the application, how they interconnect, and the complete data flow from startup to song playback.

### System Overview Diagram

```
┌───────────────────────────────────────────────────────────────────────────────────────────────┐
│                              MUSIC SYNC APP - COMPLETE ARCHITECTURE                            │
├───────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                              RENDERER PROCESS (React + TypeScript)                       │  │
│  │  ┌───────────────────────────────────────────────────────────────────────────────────┐  │  │
│  │  │  App.tsx                                                                           │  │  │
│  │  │  ├── TitleBar, Sidebar, PlaybackBar, SongList                                     │  │  │
│  │  │  ├── Settings, BatchScanProgress, NotificationToast                               │  │  │
│  │  │  └── State: playingIndex, scanStatuses, downloadProgress                          │  │  │
│  │  └───────────────────────────────────────────────────────────────────────────────────┘  │  │
│  │  ┌───────────────────────────────────────────────────────────────────────────────────┐  │  │
│  │  │  Custom Hooks                                                                      │  │  │
│  │  │  ├── useAudioPlayer.ts  → Howler.js audio playback, shuffle, repeat               │  │  │
│  │  │  ├── useMusicLibrary.ts → File scanning, sorting, single file updates             │  │  │
│  │  │  └── useSongScanner.ts  → Batch fingerprinting, API lookups, rate limiting        │  │  │
│  │  └───────────────────────────────────────────────────────────────────────────────────┘  │  │
│  │  ┌───────────────────────────────────────────────────────────────────────────────────┐  │  │
│  │  │  Services (API/IPC Communication)                                                  │  │  │
│  │  │  ├── fingerprint.ts  → Calls Main Process for fpcalc fingerprinting              │  │  │
│  │  │  ├── acoustid.ts     → Calls Main Process for AcoustID API                        │  │  │
│  │  │  └── musicbrainz.ts  → Calls Main Process for MusicBrainz API                     │  │  │
│  │  └───────────────────────────────────────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                          │                                                     │
│                                          │ IPC (contextBridge)                                 │
│                                          ▼                                                     │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                              MAIN PROCESS (Node.js + Electron)                           │  │
│  │                                                                                          │  │
│  │  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────────────────┐  │  │
│  │  │  IPC Handlers       │  │  Core Modules       │  │  Parallel Workers                │  │  │
│  │  │  ├── musicHandlers  │  │  ├── main.ts        │  │  ├── ParallelMetadataScanner    │  │  │
│  │  │  ├── apiHandlers    │  │  ├── window.ts      │  │  │   └── 15 concurrent parsers  │  │  │
│  │  │  ├── cacheHandlers  │  │  ├── preload.ts     │  │  ├── FingerprintWorkerPool      │  │  │
│  │  │  ├── youtubeHandlers│  │  ├── settings.ts    │  │  │   └── 15 concurrent fpcalc   │  │  │
│  │  │  ├── systemHandlers │  │  └── tray.ts        │  │  └── (CPU cores - 1 workers)    │  │  │
│  │  │  └── fingerprintHndl│  │                     │  │                                  │  │  │
│  │  └─────────────────────┘  └─────────────────────┘  └─────────────────────────────────┘  │  │
│  │                                                                                          │  │
│  │  ┌─────────────────────────────────────────────────────────────────────────────────────┐│  │
│  │  │  External Systems                                                                    ││  │
│  │  │  ├── SQLite (better-sqlite3) → metadataCache.db for scan tracking                  ││  │
│  │  │  ├── fpcalc binary           → Native audio fingerprinting                         ││  │
│  │  │  ├── yt-dlp binary           → YouTube audio downloads                             ││  │
│  │  │  ├── music-metadata          → ID3/Vorbis tag reading                              ││  │
│  │  │  └── taglib-wasm             → ID3/Vorbis tag writing                              ││  │
│  │  └─────────────────────────────────────────────────────────────────────────────────────┘│  │
│  └─────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                                │
└───────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Multithreaded Worker Pools

The application uses two distinct worker pool systems to maximize CPU utilization:

#### 1. Parallel Metadata Scanner (`parallelMetadataScanner.ts`)

**Purpose:** Parse ID3/Vorbis tags from audio files during initial library scan

```
┌───────────────────────────────────────────────────────────────────────────┐
│                    PARALLEL METADATA SCANNER                               │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  INPUT: Directory path (e.g., "C:/Users/Music")                           │
│                                                                            │
│  PHASE 1: File Discovery (async fs.readdir)                               │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  Recursively walk → Filter by extension → Return [filePath, ...]   │  │
│  │  Performance: ~3ms for 667 files                                    │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                              │                                             │
│                              ▼                                             │
│  PHASE 2: Parallel Parsing (N workers = CPU cores - 1)                    │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐            │  │
│  │  │Worker 1│ │Worker 2│ │Worker 3│ │  ...   │ │Worker N│            │  │
│  │  │ parse()│ │ parse()│ │ parse()│ │        │ │ parse()│            │  │
│  │  └───┬────┘ └───┬────┘ └───┬────┘ └────────┘ └───┬────┘            │  │
│  │      │          │          │                     │                  │  │
│  │      └──────────┴──────────┴─────────────────────┘                  │  │
│  │                            │                                        │  │
│  │                            ▼                                        │  │
│  │               ┌─────────────────────────┐                           │  │
│  │               │   Shared Job Queue      │                           │  │
│  │               │   [file1, file2, ...]   │                           │  │
│  │               └─────────────────────────┘                           │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                              │                                             │
│  OUTPUT: MusicFile[] with metadata                                         │
│  Performance: 667 files in ~678ms (avg 1.0ms/file)                        │
│                                                                            │
└───────────────────────────────────────────────────────────────────────────┘
```

**Key Implementation Details:**

| Aspect | Implementation |
|--------|----------------|
| **Worker Count** | `os.cpus().length - 1` (leaves 1 core for UI) |
| **Max Workers** | 16 (prevents over-parallelization) |
| **Min Workers** | 2 (ensures parallelization even on 2-core systems) |
| **Queue Type** | Shared FIFO queue (workers pull jobs as they finish) |
| **Result Order** | Results returned in original file order |
| **Album Art Limit** | 150KB max per image (prevents IPC bloat) |
| **Concurrency Lock** | Prevents race conditions from simultaneous scans |

#### 2. Fingerprint Worker Pool (`fingerprintWorkerPool.ts`)

**Purpose:** Generate audio fingerprints using fpcalc for batch song identification

```
┌───────────────────────────────────────────────────────────────────────────┐
│                    FINGERPRINT WORKER POOL                                 │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  INPUT: Array of file paths ["song1.mp3", "song2.mp3", ...]               │
│                                                                            │
│  WORKER ALLOCATION:                                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                                                                      │  │
│  │  [Slot 1]     [Slot 2]     [Slot 3]    ...    [Slot N]              │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐       ┌─────────┐            │  │
│  │  │ fpcalc  │  │ fpcalc  │  │ fpcalc  │       │ fpcalc  │            │  │
│  │  │ song1   │  │ song2   │  │ song3   │  ...  │ songN   │            │  │
│  │  │ (OS     │  │ (OS     │  │ (OS     │       │ (OS     │            │  │
│  │  │ Process)│  │ Process)│  │ Process)│       │ Process)│            │  │
│  │  └────┬────┘  └────┬────┘  └────┬────┘       └────┬────┘            │  │
│  │       │            │            │                 │                  │  │
│  │       └────────────┴────────────┴─────────────────┘                  │  │
│  │                           │                                          │  │
│  │                           ▼                                          │  │
│  │             fpcalc reads audio file from DISK                        │  │
│  │             (no audio data over IPC, just file paths)                │  │
│  │                           │                                          │  │
│  │                           ▼                                          │  │
│  │             Outputs JSON: { fingerprint, duration }                  │  │
│  │                                                                      │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  OUTPUT: PoolFingerprintResult[] (fingerprint + duration per file)        │
│  Performance: 667 files in ~12.8s (avg 19ms/file)                         │
│                                                                            │
│  NOTE: Fingerprinting is slower because it's CPU-intensive audio          │
│        processing, not just reading metadata tags                         │
│                                                                            │
└───────────────────────────────────────────────────────────────────────────┘
```

### Complete Application Startup Flow

```
┌───────────────────────────────────────────────────────────────────────────────────────────────┐
│                              APP STARTUP SEQUENCE                                              │
├───────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                │
│  1. ELECTRON INITIALIZATION (main.ts)                                                          │
│     ├── app.whenReady()                                                                        │
│     ├── Menu.setApplicationMenu(null)  // Custom frameless window                             │
│     ├── registerIpcHandlers()          // Set up IPC endpoints                                │
│     ├── createMainWindow()             // Create BrowserWindow                                 │
│     ├── createTray()                   // System tray icon                                     │
│     └── initializeDatabase()           // SQLite cache                                         │
│                                                                                                │
│  2. RENDERER INITIALIZATION (main.tsx → App.tsx)                                               │
│     ├── React mounts App component                                                             │
│     ├── useEffect hooks trigger:                                                               │
│     │   ├── useMusicLibrary.loadSavedFolder()                                                 │
│     │   └── App.loadSettings()                                                                 │
│     └── Both call scanFolder() → DEDUPLICATED by scan lock                                    │
│                                                                                                │
│  3. PARALLEL LIBRARY SCAN                                                                      │
│     ├── IPC: 'scan-music-folder' invoked                                                       │
│     ├── ParallelMetadataScanner.scanDirectory()                                               │
│     │   ├── Phase 1: discoverFiles() - ~3ms for 667 files                                     │
│     │   └── Phase 2: scanAll() - ~678ms for 667 files (15 workers)                            │
│     ├── Progress events: 'scan-progress' sent every 10 files                                  │
│     └── MusicFile[] returned over IPC (with 150KB album art limit)                            │
│                                                                                                │
│  4. UI RENDER                                                                                  │
│     ├── setTimeout(0) yields to main thread                                                   │
│     ├── setMusicFiles() triggers React re-render                                              │
│     ├── SongList renders 667 items with OverlayScrollbars                                     │
│     └── UI is now interactive                                                                  │
│                                                                                                │
│  5. BACKGROUND: Cache Status Loading                                                           │
│     ├── IPC: 'cache-get-batch-status' for all file paths                                      │
│     ├── SQLite query returns scan statuses                                                     │
│     └── UI updates scan status icons (✅ ⚠️ 🔄 🔍)                                            │
│                                                                                                │
│  TOTAL STARTUP TIME: ~1-2 seconds for 667 files                                               │
│                                                                                                │
└───────────────────────────────────────────────────────────────────────────────────────────────┘
```

### File-by-File Breakdown: Main Process

| File | Lines | Purpose | Key Functions |
|------|-------|---------|---------------|
| **main.ts** | ~80 | App entry point, window lifecycle | `app.whenReady()`, `app.on('activate')` |
| **window.ts** | ~60 | BrowserWindow creation with custom options | `createMainWindow()` |
| **preload.ts** | ~300 | Secure IPC bridge (contextBridge) | `electronAPI` object with 40+ methods |
| **tray.ts** | ~80 | System tray menu and click handlers | `createTray()` |
| **settings.ts** | ~100 | JSON settings file read/write | `getSettings()`, `saveSettings()` |
| **metadataCache.ts** | ~300 | SQLite scan tracking database | `cacheMarkFileScanned()`, `cacheGetStatus()` |
| **musicScanner.ts** | ~300 | Single-file metadata reading | `scanMusicFiles()`, `readSingleFileMetadata()` |
| **parallelMetadataScanner.ts** | ~300 | **Parallel** metadata parsing pool | `scanDirectory()`, `scanAll()` |
| **fingerprintWorkerPool.ts** | ~300 | **Parallel** fpcalc execution pool | `processBatch()`, `processQueue()` |
| **fpcalcManager.ts** | ~300 | fpcalc binary download/execution | `ensureFpcalc()`, `generateFingerprintWithFpcalc()` |
| **binaryManager.ts** | ~200 | yt-dlp binary management | `ensureYtDlp()`, `downloadYtDlp()` |
| **youtubeDownloader.ts** | ~250 | YouTube download orchestration | `downloadYouTube()` |

### File-by-File Breakdown: Renderer Process

| File | Lines | Purpose | Key Exports |
|------|-------|---------|-------------|
| **App.tsx** | ~390 | Main app shell, state orchestration | `App` component |
| **useAudioPlayer.ts** | ~500 | Howler.js audio playback | `useAudioPlayer()` hook |
| **useMusicLibrary.ts** | ~130 | Library state management | `useMusicLibrary()` hook |
| **useSongScanner.ts** | ~440 | Batch scanning with rate limits | `useSongScanner()` hook |
| **fingerprint.ts** | ~180 | Fingerprint IPC wrapper | `generateFingerprint()`, `generateFingerprintsBatch()` |
| **acoustid.ts** | ~150 | AcoustID API wrapper | `lookupFingerprint()` |
| **musicbrainz.ts** | ~200 | MusicBrainz API wrapper | `lookupRecording()`, `getCoverArtUrls()` |
| **rateLimiter.ts** | ~80 | API delay utilities | `waitForAcoustID()`, `waitForMusicBrainz()` |

### Complete Scan → Tag Flow (User Clicks "Scan All")

```
┌───────────────────────────────────────────────────────────────────────────────────────────────┐
│                              BATCH SCAN FLOW (Detailed)                                        │
├───────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                │
│  STEP 1: User clicks "Scan Unscanned Songs" in Settings                                       │
│          └── Settings.tsx → onScanAll() → useSongScanner.scanBatch(files)                    │
│                                                                                                │
│  STEP 2: PHASE 1 - PARALLEL FINGERPRINTING (Main Process)                                     │
│          │                                                                                     │
│          ├── Renderer calls: window.electronAPI.generateFingerprintsBatch(filePaths)         │
│          ├── IPC: 'generate-fingerprints-batch'                                               │
│          ├── FingerprintWorkerPool allocates 15 workers                                       │
│          │                                                                                     │
│          │   [Worker 1]──fpcalc──►[song1.mp3]──► fingerprint_1                                │
│          │   [Worker 2]──fpcalc──►[song2.mp3]──► fingerprint_2                                │
│          │   [Worker 3]──fpcalc──►[song3.mp3]──► fingerprint_3                                │
│          │   ...                                                                               │
│          │   [Worker 15]──fpcalc──►[song15.mp3]──► fingerprint_15                             │
│          │                                                                                     │
│          ├── Progress events: 'fingerprint-batch-progress' every file                         │
│          ├── UI shows: "Generating fingerprints... (15/667)"                                  │
│          └── Returns: PoolFingerprintResult[] (all fingerprints in memory)                    │
│              Time: ~12.8 seconds for 667 files                                                 │
│                                                                                                │
│  STEP 3: PHASE 2 - SEQUENTIAL API LOOKUPS (Rate Limited)                                      │
│          │                                                                                     │
│          ├── For each fingerprint (one at a time):                                            │
│          │   ├── waitForAcoustID() - 200ms delay                                              │
│          │   ├── IPC: 'lookup-acoustid' → AcoustID API → Returns MBID                        │
│          │   ├── waitForMusicBrainz() - 1100ms delay                                          │
│          │   ├── IPC: 'lookup-musicbrainz' → MusicBrainz API → Returns metadata              │
│          │   ├── pickBestRelease() - Score releases, prefer original albums                  │
│          │   ├── getCoverArtUrls() - Generate fallback URL list                               │
│          │   └── IPC: 'download-image-with-fallback' → Try URLs until one works             │
│          │                                                                                     │
│          ├── UI shows: "API lookup: Song Name (45/667)"                                       │
│          └── Time: ~1.3 seconds per song (rate limited)                                        │
│                                                                                                │
│  STEP 4: METADATA WRITING                                                                      │
│          │                                                                                     │
│          ├── IPC: 'write-metadata' with title, artist, album, year, coverArtPath             │
│          ├── Main Process: taglib-wasm reads file, modifies tags, saves                      │
│          ├── IPC: 'cache-mark-file-scanned' with MBID and success flag                        │
│          └── UI updates scan status icon: 🔍 → ✅                                              │
│                                                                                                │
│  STEP 5: IN-PLACE UI UPDATE                                                                    │
│          │                                                                                     │
│          ├── IPC: 'read-single-file-metadata' to refresh just this file                       │
│          ├── useMusicLibrary.updateSingleFile() replaces array entry                         │
│          └── React re-renders just the changed row (no scroll reset)                          │
│                                                                                                │
│  TOTAL TIME: 667 songs × 1.3s = ~14.5 minutes (API rate limited)                              │
│  (Fingerprinting adds ~13s, but runs in parallel before API phase)                            │
│                                                                                                │
└───────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Performance Metrics (Real-World)

| Operation | Files | Time | Per-File | Parallelism |
|-----------|-------|------|----------|-------------|
| **File Discovery** | 667 | 3ms | 0.004ms | Async I/O |
| **Metadata Parsing** | 667 | 678ms | 1.0ms | 15 workers |
| **Fingerprint Batch** | 667 | 12.8s | 19ms | 15 fpcalc processes |
| **AcoustID Lookup** | 1 | 200ms+ | Rate limited | Sequential |
| **MusicBrainz Lookup** | 1 | 1100ms+ | Rate limited | Sequential |
| **Cover Art Download** | 1 | 100-500ms | Network | Sequential |
| **Metadata Write** | 1 | 50-200ms | Disk I/O | Sequential |

### UI Freeze Fix: Album Art Size Limiting

**The Problem:**

After the parallel metadata scan completed, the UI would freeze for 3-5 seconds before displaying songs. Investigation revealed the root cause:

```
667 songs × 200KB average album art = 133MB+ of base64 strings
↓
Serialized as JSON over IPC
↓
Deserialized in Renderer Process
↓
React renders 667 <img> tags with data: URIs
↓
UI FROZEN for 3-5 seconds
```

**The Solution:**

Limit embedded album art to **150KB max** during initial scan. Larger cover art is skipped (shows placeholder) and can be loaded on-demand.

```typescript
// In parallelMetadataScanner.ts
const MAX_ALBUM_ART_SIZE = 150 * 1024 // 150KB

if (parsed.common.picture && parsed.common.picture.length > 0) {
  const picture = parsed.common.picture[0]
  if (picture.data.length <= MAX_ALBUM_ART_SIZE) {
    // Include small/medium images inline
    albumArt = `data:${picture.format};base64,${buffer.toString('base64')}`
  } else {
    // Large images (high-res FLAC covers) use placeholder
    albumArt = undefined
  }
}
```

**Additional Optimizations:**

| Fix | Problem | Solution |
|-----|---------|----------|
| **Album Art Limit (150KB)** | 133MB+ IPC payload | Skip large images, reduce to ~15-30MB |
| **Scan Lock** | Multiple simultaneous scans race condition | Return existing promise if already scanning |
| **Main Thread Yield** | UI frozen during array processing | `setTimeout(0)` before `setMusicFiles()` |

**Impact:**

| Metric | Before | After |
|--------|--------|-------|
| IPC Payload (667 songs) | ~133MB | ~15-30MB |
| UI Freeze Duration | 3-5 seconds | <500ms |
| Songs with Placeholder | 0% | ~5-10% (large HD covers) |

### Performance Projections by Library Size (4-Core System)

On a **4-core system**, the app uses **3 parallel workers** (cores - 1 for UI headroom).

**Initial Library Scan (Metadata Parsing):**

| Library Size | Sequential (Old) | Parallel 3 Workers | Speedup |
|--------------|------------------|--------------------| --------|
| 100 songs | ~10.0s | ~3.3s | **3.0x** |
| 500 songs | ~50.0s | ~16.7s | **3.0x** |
| 1,000 songs | ~100.0s | ~33.3s | **3.0x** |
| 5,000 songs | ~8.3 min | ~2.8 min | **3.0x** |
| 10,000 songs | ~16.7 min | ~5.6 min | **3.0x** |

*Based on ~100ms average per file for metadata parsing*

**Fingerprint Generation (fpcalc):**

| Library Size | Sequential | Parallel 3 Workers | Speedup |
|--------------|------------|--------------------| --------|
| 100 songs | ~1.9s | ~0.6s | **3.0x** |
| 500 songs | ~9.5s | ~3.2s | **3.0x** |
| 1,000 songs | ~19.0s | ~6.3s | **3.0x** |
| 5,000 songs | ~1.6 min | ~32s | **3.0x** |
| 10,000 songs | ~3.2 min | ~1.1 min | **3.0x** |

*Based on ~19ms average per file for fingerprinting*

**Total Batch Scan Time (Fingerprint + API Lookups):**

| Library Size | Fingerprint Phase | API Phase (Rate Limited) | **Total Time** |
|--------------|-------------------|--------------------------|---------------|
| 100 songs | ~0.6s | ~2.2 min | **~2.3 min** |
| 500 songs | ~3.2s | ~10.8 min | **~11 min** |
| 1,000 songs | ~6.3s | ~21.7 min | **~22 min** |
| 5,000 songs | ~32s | ~1.8 hours | **~1.8 hours** |
| 10,000 songs | ~1.1 min | ~3.6 hours | **~3.6 hours** |

*API rate limits: 200ms (AcoustID) + 1100ms (MusicBrainz) = 1.3s per song*

**Note:** API lookups are rate-limited and always sequential. The parallelization benefit is in:
1. **Initial scan** - Loading library on startup
2. **Fingerprinting** - Generating audio fingerprints before API phase

### Performance Scaling by CPU Cores

| CPU Cores | Workers | 667 Files Metadata | 667 Files Fingerprint |
|-----------|---------|--------------------|-----------------------|
| 2 cores | 2 | ~33s | ~6.3s |
| 4 cores | 3 | ~22s | ~4.2s |
| 8 cores | 7 | ~9.5s | ~1.8s |
| 16 cores | 15 | ~4.5s | ~0.8s |
| 32 cores | 16 (capped) | ~4.2s | ~0.8s |

*Workers capped at 16 to prevent over-parallelization*

### IPC Channel Reference (Complete List)

| Channel | Direction | Purpose | Handler File |
|---------|-----------|---------|--------------|
| `scan-music-folder` | Renderer → Main | Parallel library scan | musicHandlers.ts |
| `select-music-folder` | Renderer → Main | Folder picker dialog | musicHandlers.ts |
| `read-single-file-metadata` | Renderer → Main | Single file re-read | musicHandlers.ts |
| `write-metadata` | Renderer → Main | Write ID3/Vorbis tags | musicHandlers.ts |
| `lookup-acoustid` | Renderer → Main | AcoustID API call | apiHandlers.ts |
| `lookup-musicbrainz` | Renderer → Main | MusicBrainz API call | apiHandlers.ts |
| `download-image-with-fallback` | Renderer → Main | Cover art download | apiHandlers.ts |
| `generate-fingerprint` | Renderer → Main | Single file fpcalc | fingerprintHandlers.ts |
| `generate-fingerprints-batch` | Renderer → Main | Parallel fpcalc batch | fingerprintHandlers.ts |
| `fingerprint-batch-progress` | Main → Renderer | Progress updates | fingerprintHandlers.ts |
| `scan-progress` | Main → Renderer | Library scan progress | musicHandlers.ts |
| `cache-mark-file-scanned` | Renderer → Main | Update SQLite cache | cacheHandlers.ts |
| `cache-get-batch-status` | Renderer → Main | Bulk status query | cacheHandlers.ts |
| `download-youtube` | Renderer → Main | Start YouTube download | youtubeHandlers.ts |
| `download-progress` | Main → Renderer | Download percentage | youtubeHandlers.ts |
| `get-settings` / `save-settings` | Renderer → Main | Settings persistence | systemHandlers.ts |
| `minimize-window` / `maximize-window` / `close-window` | Renderer → Main | Window controls | systemHandlers.ts |

### CPU Utilization Example (16-core System)

```
During Parallel Metadata Scan:
┌────────────────────────────────────────────────────────────────────────┐
│ CPU Core │  Usage  │ Process                                          │
├──────────┼─────────┼──────────────────────────────────────────────────┤
│ Core 0   │  15%    │ Electron Main Process                            │
│ Core 1   │  85%    │ Worker 1 (music-metadata parsing)                │
│ Core 2   │  85%    │ Worker 2 (music-metadata parsing)                │
│ Core 3   │  85%    │ Worker 3 (music-metadata parsing)                │
│ ...      │  ...    │ ...                                              │
│ Core 15  │  85%    │ Worker 15 (music-metadata parsing)               │
└────────────────────────────────────────────────────────────────────────┘

During Parallel Fingerprinting:
┌────────────────────────────────────────────────────────────────────────┐
│ CPU Core │  Usage  │ Process                                          │
├──────────┼─────────┼──────────────────────────────────────────────────┤
│ Core 0   │  10%    │ Electron Main Process                            │
│ Core 1   │  95%    │ fpcalc.exe (song1.mp3)                           │
│ Core 2   │  95%    │ fpcalc.exe (song2.mp3)                           │
│ Core 3   │  95%    │ fpcalc.exe (song3.mp3)                           │
│ ...      │  ...    │ ...                                              │
│ Core 15  │  95%    │ fpcalc.exe (song15.mp3)                          │
└────────────────────────────────────────────────────────────────────────┘
```

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
18. **Immediate Asset Cleanup** - Delete temp cover art after embedding into audio file

---

## Platform Support Matrix

### yt-dlp Binary ✅ Full Cross-Platform Support

| Platform | Architecture | Binary Name | Status |
|----------|--------------|-------------|--------|
| Windows | x64 | `yt-dlp.exe` | ✅ Supported |
| Windows | ARM64 | `yt-dlp_win_arm64.exe` | ✅ Supported |
| macOS | x64 (Intel) | `yt-dlp_macos` | ✅ Supported |
| macOS | ARM64 (M1/M2/M3) | `yt-dlp_macos_arm64` | ✅ Supported |
| Linux | x64 | `yt-dlp_linux` | ✅ Supported |
| Linux | ARM64 | `yt-dlp_linux_arm64` | ✅ Supported |

**Download Location:** `youtubeDownloader.ts` → `getAssetNameForPlatform()`

### fpcalc Binary ⚠️ Partial ARM64 Support

| Platform | Architecture | Binary Name | Status |
|----------|--------------|-------------|--------|
| Windows | x64 | `chromaprint-fpcalc-1.5.1-windows-x86_64.zip` | ✅ Supported |
| Windows | ARM64 | ❌ NOT AVAILABLE | ⛔ **Not supported** |
| macOS | x64 (Intel) | `chromaprint-fpcalc-1.5.1-macos-x86_64.tar.gz` | ✅ Supported |
| macOS | ARM64 (M1/M2/M3) | `chromaprint-fpcalc-1.5.1-macos-arm64.tar.gz` | ✅ Supported |
| Linux | x64 | `chromaprint-fpcalc-1.5.1-linux-x86_64.tar.gz` | ✅ Supported |
| Linux | ARM64 | ❌ NOT AVAILABLE | ⛔ **Not supported** |

**Note:** Chromaprint (fpcalc) project doesn't publish ARM64 builds for Windows or Linux.

**Download Configuration:** `fpcalcManager.ts` → `DOWNLOAD_URLS`

```typescript
const DOWNLOAD_URLS: Record<string, string> = {
    'win32-x64': '...chromaprint-fpcalc-...-windows-x86_64.zip',
    'darwin-x64': '...chromaprint-fpcalc-...-macos-x86_64.tar.gz',
    'darwin-arm64': '...chromaprint-fpcalc-...-macos-arm64.tar.gz',  // ✅ macOS ARM64 works
    'linux-x64': '...chromaprint-fpcalc-...-linux-x86_64.tar.gz',
    // 'win32-arm64' and 'linux-arm64' are NOT available
}
```

### Feature Availability by Platform

| Platform | YouTube Download | Audio Fingerprinting | Metadata Tagging |
|----------|-----------------|---------------------|-----------------|
| Windows x64 | ✅ | ✅ | ✅ |
| Windows ARM64 | ✅ | ⛔ No fpcalc | ✅ |
| macOS x64 | ✅ | ✅ | ✅ |
| macOS ARM64 | ✅ | ✅ | ✅ |
| Linux x64 | ✅ | ✅ | ✅ |
| Linux ARM64 | ✅ | ⛔ No fpcalc | ✅ |

---

## Cover Art Management

### Cover Art Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          COVER ART FLOW                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. DOWNLOAD                                                                │
│     └── Cover Art Archive API → Download to temp file                       │
│         Location: %APPDATA%/music-sync-app/assets/cover_xyz.jpg             │
│                                                                             │
│  2. EMBED                                                                   │
│     └── write-cover-art IPC handler → taglib-wasm embeds into audio file   │
│         The cover art is now part of the MP3/FLAC ID3 tags                  │
│                                                                             │
│  3. CLEANUP (IMMEDIATE) ✨ NEW                                              │
│     └── Temp file deleted immediately after successful embedding            │
│         fs.unlinkSync(resolvedImagePath)                                    │
│         Console: "[CoverArt] Cleaned up temp file: cover_xyz.jpg"           │
│                                                                             │
│  4. BACKUP CLEANUP (30 days)                                                │
│     └── cleanupOldAssets() runs on each download                            │
│         Deletes any orphaned files older than 30 days                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Relevant Code

| File | Function | Purpose |
|------|----------|---------|
| `musicHandlers.ts` | `write-cover-art` | Embeds then deletes temp file |
| `apiHandlers.ts` | `cleanupOldAssets()` | Backup 30-day cleanup |
| `apiHandlers.ts` | `download-image-with-fallback` | Downloads cover art |

### Cover Art Size Limit

During initial library scan, album art is limited to **150KB** to prevent IPC payload bloat:

```typescript
// In parallelMetadataScanner.ts
const MAX_ALBUM_ART_SIZE = 150 * 1024 // 150KB

if (picture.data.length > MAX_ALBUM_ART_SIZE) {
  // Skip large images (show placeholder)
  albumArt = undefined
}
```

---

## Scan Progress UI

### Detailed API Phase Display

The batch scan progress UI shows exactly which API is being called:

```
┌─────────────────────────────────────────┐
│ 🔍 Scanning Library                   ✕ │
│                                         │
│            45 of 667                    │
│ [=================>...............    ] │
│                                         │
│      🎵 AcoustID lookup...              │
│      Song Name Here                     │
└─────────────────────────────────────────┘
```

### Phase Progression

| Phase | Icon | Display Text | Duration |
|-------|------|--------------|----------|
| `acoustid` | 🎵 | AcoustID lookup... | ~200ms (rate limited) |
| `musicbrainz` | 📀 | MusicBrainz lookup... | ~1100ms (rate limited) |
| `coverart` | 🖼️ | Cover Art lookup... | ~100-500ms |
| `writing` | 💾 | Writing metadata... | ~50-200ms |

### Implementation

**Types:** `useSongScanner.ts`
```typescript
export type ApiPhase = 'acoustid' | 'musicbrainz' | 'coverart' | 'writing' | null

export interface BatchScanProgress {
  isScanning: boolean
  currentIndex: number
  totalCount: number
  currentSongName: string
  apiPhase?: ApiPhase  // NEW
}
```

**Phase Updates:** Called before each API request
```typescript
updateApiPhase('acoustid')
await waitForAcoustID()
const acoustidResult = await lookupFingerprint(...)

updateApiPhase('musicbrainz')
await waitForMusicBrainz()
const mbData = await lookupRecording(...)

updateApiPhase('coverart')
const downloadResult = await window.electronAPI.downloadImageWithFallback(...)

updateApiPhase('writing')
const metadataResult = await window.electronAPI.writeMetadata(...)
```

**Component:** `BatchScanProgress.tsx`
```tsx
const phaseDisplay = {
  acoustid: { icon: '🎵', text: 'AcoustID lookup...' },
  musicbrainz: { icon: '📀', text: 'MusicBrainz lookup...' },
  coverart: { icon: '🖼️', text: 'Cover Art lookup...' },
  writing: { icon: '💾', text: 'Writing metadata...' }
}
```

---

## Keyboard Shortcuts

Global keyboard shortcuts are registered in `App.tsx` for playback control:

| Key | Action | Implementation |
|-----|--------|----------------|
| `Space` | Play / Pause | `togglePlayPause()` |
| `→` (Arrow Right) | Next track | `playNext()` |
| `←` (Arrow Left) | Previous track | `playPrevious()` |
| `↑` (Arrow Up) | Volume up (+5%) | `setVolume(volume + 0.05)` |
| `↓` (Arrow Down) | Volume down (-5%) | `setVolume(volume - 0.05)` |

**Note:** Shortcuts are disabled when focus is in an input field, textarea, or contenteditable element.

```typescript
// In App.tsx
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
    
    switch (e.key) {
      case ' ':        togglePlayPause(); break
      case 'ArrowRight': playNext(); break
      case 'ArrowLeft':  playPrevious(); break
      case 'ArrowUp':    setVolume(Math.min(1, volume + 0.05)); break
      case 'ArrowDown':  setVolume(Math.max(0, volume - 0.05)); break
    }
  }
  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}, [togglePlayPause, playNext, playPrevious, volume, setVolume])
```

---

## Slider Design (Seek Bar & Volume)

The playback seek bar and volume slider use a modern, premium design with gradients and smooth animations.

### Design Features

| Feature | Seek Bar | Volume Slider |
|---------|----------|---------------|
| **Track Height** | 4px | 3px |
| **Track Gradient** | `#667eea → #764ba2 → #f093fb` | `#667eea → #764ba2` |
| **Track Glow** | 8px purple shadow | 6px purple shadow |
| **Handle Size** | 14px | 10px |
| **Handle Style** | White gradient, no border | White gradient, no border |
| **Handle Visibility** | Hidden until hover | Hidden until hover |
| **Hover Effect** | Scale 1.2x + glow halo | Scale 1.3x + glow halo |
| **Drag Effect** | Scale 1.3x + intense glow | Scale 1.4x + intense glow |

### Spotify-Style Hidden Handle

The handle is hidden by default and appears on hover:

```css
.seek-bar-slider .rc-slider-handle {
  opacity: 0;  /* Hidden by default */
}

.seek-bar-wrapper:hover .seek-bar-slider .rc-slider-handle {
  opacity: 1;  /* Show on hover */
}
```

### Gradient & Glow

```css
.seek-bar-slider .rc-slider-track {
  background: linear-gradient(90deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
  box-shadow: 0 0 8px rgba(102, 126, 234, 0.4);
}
```

---

## Auto-Scroll to Playing Song

When navigating tracks (via keyboard or buttons), the song list automatically scrolls to keep the currently playing song **centered** in the viewport.

### Implementation (`SongList.tsx`)

```typescript
// Refs for each song item
const songRefs = useRef<Map<number, HTMLLIElement>>(new Map())

// Callback to register refs
const setSongRef = useCallback((index: number, el: HTMLLIElement | null) => {
  if (el) songRefs.current.set(index, el)
  else songRefs.current.delete(index)
}, [])

// Auto-scroll when playingIndex changes
useEffect(() => {
  if (playingIndex !== null && playingIndex >= 0) {
    songRefs.current.get(playingIndex)?.scrollIntoView({
      behavior: 'smooth',
      block: 'center'  // Center in viewport
    })
  }
}, [playingIndex])
```

### Usage in JSX

```tsx
<li ref={(el) => setSongRef(index, el)} className={...}>
```

### Behavior

| Action | Result |
|--------|--------|
| Press `→` (next) | List smoothly scrolls to center new song |
| Press `←` (prev) | List smoothly scrolls to center new song |
| Click next/prev button | Same scroll behavior |
| Song ends, auto-advances | List follows to next song |

---

## Known Limitations & Future Work

- **Library UX:** Search bar added; no multi-select for bulk actions yet.
- **Downloads:** No download queue/history; single-link flow with fixed delay.
- **Cover art:** Downloaded art cleaned immediately after embedding; backup cleanup at 30 days.
- **Incremental updates:** No file-system watch; rescans are manual.
- **Keyboard shortcuts:** Basic playback controls implemented; no mute toggle or seek shortcuts yet.
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
