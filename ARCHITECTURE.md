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
| **Audio Fingerprinting** | @unimusic/chromaprint | Generate audio fingerprints |
| **Tag Writing** | taglib-wasm | Write cover art to files |
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
│   └── ipc/
│       ├── handlers.ts          # Main IPC registration (imports modules)
│       └── modules/             # Modular IPC handlers
│           ├── musicHandlers.ts     # Folder scanning, cover art writing
│           ├── apiHandlers.ts       # AcoustID, MusicBrainz, image download
│           ├── youtubeHandlers.ts   # YouTube download, binary status
│           └── systemHandlers.ts    # Window controls, settings, platform
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
│  │  • downloadYouTube()                • maximizeWindow()        │  │
│  │  • getSettings()                    • closeWindow()           │  │
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

**Modular Structure:**

```
electron/ipc/
├── handlers.ts              # Main entry - imports and registers all modules
└── modules/
    ├── musicHandlers.ts     # Music file operations
    ├── apiHandlers.ts       # External API operations
    ├── youtubeHandlers.ts   # YouTube download operations
    └── systemHandlers.ts    # Window & settings operations
```

**Main handlers.ts:**

```typescript
import { registerMusicHandlers } from './modules/musicHandlers'
import { registerApiHandlers } from './modules/apiHandlers'
import { registerYoutubeHandlers } from './modules/youtubeHandlers'
import { registerSystemHandlers } from './modules/systemHandlers'

export function registerIpcHandlers() {
  registerMusicHandlers()
  registerApiHandlers()
  registerYoutubeHandlers()
  registerSystemHandlers()
}
```

**All IPC Endpoints by Module:**

| Module | Handler | Type | Purpose |
|--------|---------|------|---------|
| **musicHandlers** | `scan-music-folder` | invoke | Scan directory for music files |
| | `select-music-folder` | invoke | Open folder selection dialog |
| | `read-file-buffer` | invoke | Read file for fingerprinting |
| | `write-cover-art` | invoke | Embed cover art in audio file |
| **apiHandlers** | `lookup-acoustid` | invoke | Query AcoustID API |
| | `lookup-musicbrainz` | invoke | Query MusicBrainz API |
| | `download-image` | invoke | Download cover art image |
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

---

### 5. `electron/musicScanner.ts` - Music File Scanner

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

**Actions:**
- `playSong(file, index)` - Create Howl, start playback
- `togglePlayPause()` - Pause/Resume
- `playNext()` / `playPrevious()` - Navigate playlist
- `seek(time)` - Jump to position
- `setVolume(volume)` - Adjust volume

---

### 3. `src/hooks/useMusicLibrary.ts` - Library Management Hook

Manages the music file collection and sorting.

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

---

## Key Design Patterns

1. **Custom Hooks** - Encapsulate complex logic (`useAudioPlayer`, `useMusicLibrary`)
2. **Memoization** - `useMemo` for sorted music files
3. **Modular IPC Handlers** - Split by feature for maintainability
4. **Cleanup Functions** - All IPC listeners return cleanup functions
5. **Rate Limiting** - 10-second delay between YouTube downloads
6. **Path Normalization** - Cross-platform file:// URL generation

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

