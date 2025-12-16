# Music Sync App - Architecture Documentation

> 🎓 **For Beginners**: This guide is written for developers new to Electron. Start with the [Quick Start Guide](#-quick-start-guide-for-beginners) section to understand how the app works.

## Table of Contents

1. [🚀 Quick Start Guide (For Beginners)](#-quick-start-guide-for-beginners)
2. [Overview](#overview)
3. [Tech Stack](#tech-stack)
4. [Electron Primer (For Beginners)](#electron-primer-for-beginners)
5. [High-Level Architecture](#high-level-architecture)
6. [Directory Structure](#directory-structure)
7. [Main Process](#main-process)
8. [Renderer Process](#renderer-process)
9. [IPC Communication](#ipc-communication)
10. [Playlist System](#playlist-system)
11. [Core Flows](#core-flows)
12. [External API Integration](#external-api-integration)
13. [Security Architecture](#security-architecture)
14. [Cross-Platform Strategy](#cross-platform-strategy)
15. [Key Design Patterns](#key-design-patterns)
16. [Visual Enhancements](#visual-enhancements)
17. [Known Limitations & Future Work](#known-limitations--future-work)
18. [Running the App](#running-the-app)

---

## 🚀 Quick Start Guide (For Beginners)

If you're new to Electron, this section will help you understand how every file connects to create a working desktop music player.

### The Two Worlds of Electron

Think of this app as having two separate programs running at the same time:

| World | Folder | What it does | Technology |
|-------|--------|--------------|------------|
| **Backend** | `electron/` | Handles system stuff (files, downloads, database) | Node.js |
| **Frontend** | `src/` | Shows the UI (buttons, lists, player) | React |

These two worlds **cannot directly talk to each other** for security. They communicate through a "bridge" called the **Preload Script**.

### 📁 File Map: What Does What?

Here's every important file and what it exports:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          ELECTRON (Backend - Node.js)                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  electron/main.ts          ─── ENTRY POINT ───                              │
│  ├── imports: window.ts, tray.ts, handlers.ts, settings.ts                  │
│  ├── creates: The app window                                                │
│  └── starts: Everything when you run `npm run dev`                          │
│                                                                             │
│  electron/window.ts                                                         │
│  ├── exports: createWindow()                                                │
│  └── does: Creates the app window with custom title bar                     │
│                                                                             │
│  electron/preload.ts       ─── THE BRIDGE ───                               │
│  ├── exports: electronAPI (exposed to React)                                │
│  └── does: Safely exposes backend functions to the frontend                 │
│                                                                             │
│  electron/tray.ts                                                           │
│  ├── exports: createTray(), updateTrayMenu()                                │
│  └── does: System tray icon with play/pause controls                        │
│                                                                             │
│  electron/musicScanner.ts                                                   │
│  ├── exports: scanMusicFolder(), MusicFile type                             │
│  └── does: Finds music files and reads their metadata (title, artist, art)  │
│                                                                             │
│  electron/youtubeDownloader.ts                                              │
│  ├── exports: downloadVideo()                                               │
│  └── does: Downloads audio from YouTube using yt-dlp                        │
│                                                                             │
│  electron/playlistDatabase.ts                                               │
│  ├── exports: PlaylistDatabase class                                        │
│  └── does: Saves/loads playlists to SQLite database                         │
│                                                                             │
│  electron/ipc/handlers.ts  ─── API ROUTER ───                               │
│  ├── imports: all handler modules from ./modules/                           │
│  ├── exports: registerAllHandlers()                                         │
│  └── does: Connects frontend requests to backend functions                  │
│                                                                             │
│  electron/ipc/modules/                                                      │
│  ├── musicHandlers.ts    → scanning folders, reading files                  │
│  ├── playlistHandlers.ts → create/delete/update playlists                   │
│  ├── youtubeHandlers.ts  → download from YouTube                            │
│  ├── apiHandlers.ts      → call external APIs (AcoustID, MusicBrainz)       │
│  ├── systemHandlers.ts   → window controls (minimize, close)                │
│  ├── cacheHandlers.ts    → metadata database operations                     │
│  └── fingerprintHandlers.ts → audio fingerprinting (fpcalc)                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                          SRC (Frontend - React)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  src/main.tsx              ─── ENTRY POINT ───                              │
│  ├── imports: App.tsx                                                       │
│  └── does: Mounts React app to the HTML page                                │
│                                                                             │
│  src/App.tsx               ─── THE BRAIN ───                                │
│  ├── imports: ALL hooks, ALL components                                     │
│  ├── exports: App (default)                                                 │
│  └── does: Coordinates everything - state, playback, UI                     │
│                                                                             │
│  ─────────────────── HOOKS (State Management) ──────────────────            │
│                                                                             │
│  src/hooks/useAudioPlayer.ts                                                │
│  ├── exports: useAudioPlayer()                                              │
│  ├── imported by: App.tsx                                                   │
│  └── does: Play, pause, skip, seek, volume control                          │
│                                                                             │
│  src/hooks/useMusicLibrary.ts                                               │
│  ├── exports: useMusicLibrary()                                             │
│  ├── imported by: App.tsx                                                   │
│  └── does: Load music files from folder, sort, filter                       │
│                                                                             │
│  src/hooks/usePlaylists.ts                                                  │
│  ├── exports: usePlaylists()                                                │
│  ├── imported by: App.tsx                                                   │
│  └── does: Create playlists, add songs, delete playlists                    │
│                                                                             │
│  src/hooks/useSongScanner.ts                                                │
│  ├── exports: useSongScanner()                                              │
│  ├── imported by: App.tsx                                                   │
│  └── does: Identify songs using audio fingerprinting                        │
│                                                                             │
│  ─────────────────── COMPONENTS (UI Pieces) ────────────────────            │
│                                                                             │
│  src/components/layout/                                                     │
│  ├── TitleBar/TitleBar.tsx   → Custom window controls (min/max/close)       │
│  ├── Sidebar/Sidebar.tsx     → Navigation: playlists, artists, albums       │
│  └── PlaybackBar/PlaybackBar.tsx → Player controls at bottom                │
│                                                                             │
│  src/components/library/                                                    │
│  ├── SongList/SongList.tsx   → List of songs with right-click menu          │
│  └── BatchScanProgress/      → Floating progress card for batch scans       │
│                                                                             │
│  src/components/playlists/                                                  │
│  ├── PlaylistList.tsx        → List of playlists in sidebar                 │
│  └── CreatePlaylistModal.tsx → Modal dialog to create playlist              │
│                                                                             │
│  src/components/common/                                                     │
│  ├── AudioVisualizer/        → Animated bars that react to music            │
│  ├── ContextMenu/            → Right-click popup menu                       │
│  └── NotificationToast/      → Pop-up notifications                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 🔄 How Data Flows: Playing a Song

Let's trace what happens when you click a song:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  STEP 1: You click a song in the UI                                         │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  SongList.tsx                                                                │
│       │                                                                      │
│       ▼ calls onPlaySong(file, index)                                        │
│                                                                              │
│  App.tsx (receives the call)                                                 │
│       │                                                                      │
│       ▼ calls playSong(file, index) from useAudioPlayer hook                 │
│                                                                              │
│  useAudioPlayer.ts                                                           │
│       │                                                                      │
│       ▼ creates new Howl({ src: 'file://path/to/song.mp3' })                 │
│       ▼ calls sound.play()                                                   │
│       ▼ updates state: setIsPlaying(true), setPlayingIndex(index)            │
│                                                                              │
│  React re-renders...                                                         │
│       │                                                                      │
│       ▼ PlaybackBar shows the song title, artist, album art                  │
│       ▼ SongList highlights the playing song                                 │
│       ▼ AudioVisualizer starts animating                                     │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 🔄 How Data Flows: Loading Music from a Folder

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  STEP 1: You click "Select Folder" button                                   │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [FRONTEND] App.tsx → TitleBar.tsx                                           │
│       │                                                                      │
│       ▼ Button onClick calls: window.electronAPI.openFolderDialog()          │
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│  STEP 2: Request goes through the bridge                                    │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [PRELOAD] preload.ts                                                        │
│       │                                                                      │
│       ▼ ipcRenderer.invoke('dialog:openFolder')                              │
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│  STEP 3: Backend handles the request                                        │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [BACKEND] ipc/handlers.ts → ipc/modules/musicHandlers.ts                    │
│       │                                                                      │
│       ▼ Shows native folder picker dialog                                    │
│       ▼ User selects: "C:\Users\Music"                                       │
│                                                                              │
│  [BACKEND] musicScanner.ts                                                   │
│       │                                                                      │
│       ▼ Recursively finds all .mp3, .flac, .wav files                        │
│       ▼ Uses music-metadata to read ID3 tags                                 │
│       ▼ Returns array of MusicFile objects                                   │
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│  STEP 4: Data returns to frontend                                           │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [FRONTEND] useMusicLibrary.ts                                               │
│       │                                                                      │
│       ▼ Updates state: setMusicFiles([...667 songs...])                      │
│                                                                              │
│  React re-renders...                                                         │
│       │                                                                      │
│       ▼ SongList displays all 667 songs                                      │
│       ▼ Sidebar shows Artists and Albums extracted from songs                │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 🔄 How Data Flows: Creating a Playlist

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  User clicks "Create Playlist" → types "My Favorites" → clicks Create       │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [FRONTEND] CreatePlaylistModal.tsx                                          │
│       │                                                                      │
│       ▼ onCreate("My Favorites", "Description")                              │
│                                                                              │
│  [FRONTEND] App.tsx → usePlaylists.ts                                        │
│       │                                                                      │
│       ▼ createPlaylist("My Favorites", "Description")                        │
│       ▼ Calls: window.electronAPI.createPlaylist(...)                        │
│                                                                              │
│  [PRELOAD] preload.ts                                                        │
│       │                                                                      │
│       ▼ ipcRenderer.invoke('playlist:create', ...)                           │
│                                                                              │
│  [BACKEND] playlistHandlers.ts                                               │
│       │                                                                      │
│       ▼ playlistDb.createPlaylist("My Favorites", "Description")             │
│                                                                              │
│  [BACKEND] playlistDatabase.ts                                               │
│       │                                                                      │
│       ▼ Inserts into SQLite: INSERT INTO playlists (name, description) ...   │
│       ▼ Returns: { id: 1, name: "My Favorites", songCount: 0 }               │
│                                                                              │
│  [FRONTEND] usePlaylists.ts                                                  │
│       │                                                                      │
│       ▼ Updates state: setPlaylists([...playlists, newPlaylist])             │
│                                                                              │
│  React re-renders...                                                         │
│       │                                                                      │
│       ▼ Sidebar now shows "My Favorites" in the playlist list                │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 📦 Key Exports Summary

Here's a cheat sheet of what each file exports and who uses it:

| File | Exports | Used By |
|------|---------|---------|
| **electron/main.ts** | (entry point) | Electron runtime |
| **electron/preload.ts** | `electronAPI` | All React components via `window.electronAPI` |
| **electron/musicScanner.ts** | `scanMusicFolder()`, `MusicFile` type | musicHandlers.ts |
| **electron/playlistDatabase.ts** | `PlaylistDatabase` class | playlistHandlers.ts |
| **src/App.tsx** | `App` component | main.tsx |
| **src/hooks/useAudioPlayer.ts** | `useAudioPlayer()` hook | App.tsx |
| **src/hooks/useMusicLibrary.ts** | `useMusicLibrary()` hook | App.tsx |
| **src/hooks/usePlaylists.ts** | `usePlaylists()` hook | App.tsx |
| **src/components/layout/Sidebar/Sidebar.tsx** | `Sidebar` component | App.tsx |
| **src/components/layout/PlaybackBar/PlaybackBar.tsx** | `PlaybackBar` component | App.tsx |
| **src/components/library/SongList/SongList.tsx** | `SongList` component | App.tsx |
| **src/components/playlists/index.ts** | `PlaylistList`, `CreatePlaylistModal` | Sidebar.tsx, App.tsx |

### 🎯 Where to Start Reading Code

If you're new, read the files in this order:

1. **`electron/main.ts`** - See how the app starts
2. **`electron/preload.ts`** - See the API bridge between backend and frontend
3. **`src/main.tsx`** and **`src/App.tsx`** - See how React starts and coordinates everything
4. **`src/hooks/useAudioPlayer.ts`** - See how music playback works
5. **`src/components/layout/PlaybackBar/PlaybackBar.tsx`** - See a complete UI component

### 🔧 Common Patterns You'll See

#### Pattern 1: IPC Call (Frontend → Backend → Frontend)
```typescript
// Frontend (React component or hook)
const result = await window.electronAPI.someFunction(arg1, arg2)

// Preload (preload.ts) - the bridge
someFunction: (arg1, arg2) => ipcRenderer.invoke('channel:name', arg1, arg2)

// Backend (handler in ipc/modules/)
ipcMain.handle('channel:name', async (event, arg1, arg2) => {
  // Do work...
  return result
})
```

#### Pattern 2: React Hook State
```typescript
// In a hook file like useAudioPlayer.ts
export function useAudioPlayer() {
  const [isPlaying, setIsPlaying] = useState(false)  // State
  
  const play = () => { /* ... */ setIsPlaying(true) }  // Actions that update state
  
  return { isPlaying, play }  // Return state and actions for components to use
}

// In App.tsx
const { isPlaying, play } = useAudioPlayer()  // Use the hook
```

#### Pattern 3: Component Props Flow
```
App.tsx (holds all state)
    │
    ├── passes props to → PlaybackBar (currentSong, isPlaying, onPlayPause)
    │
    ├── passes props to → SongList (songs, playingIndex, onPlaySong)
    │
    └── passes props to → Sidebar (playlists, selectedPlaylist, onPlaylistClick)
```

---

## Overview

This is an **Electron + React + TypeScript** desktop music player application. It allows users to:

- Browse and play local music files
- Download music from YouTube using `yt-dlp`
- Control playback from the system tray
- Identify songs using audio fingerprinting (AcoustID + MusicBrainz)
- Custom frameless window with a soft blue title bar
- Filter library by artist/album via sidebar
- Create and manage playlists

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
│   ├── parallelMetadataScanner.ts # Parallel scanning with worker pool
│   ├── youtubeDownloader.ts     # YouTube download with yt-dlp
│   ├── settings.ts              # Settings persistence (JSON)
│   ├── binaryManager.ts         # Binary status checking (yt-dlp)
│   ├── fpcalcManager.ts         # fpcalc binary download & fingerprinting
│   ├── fingerprintWorkerPool.ts # Worker pool for fingerprint processing
│   ├── metadataCache.ts         # SQLite database for scan tracking
│   ├── playlistDatabase.ts      # SQLite database for playlist storage
│   ├── electron-env.d.ts        # Electron environment types
│   ├── __tests__/               # Electron unit tests
│   └── ipc/
│       ├── handlers.ts          # Main IPC registration (imports modules)
│       └── modules/             # Modular IPC handlers
│           ├── musicHandlers.ts     # Folder scanning, cover art writing
│           ├── apiHandlers.ts       # AcoustID, MusicBrainz, image download
│           ├── youtubeHandlers.ts   # YouTube download, binary status
│           ├── systemHandlers.ts    # Window controls, settings, platform
│           ├── cacheHandlers.ts     # Metadata cache operations
│           ├── fingerprintHandlers.ts # Audio fingerprinting (fpcalc)
│           ├── playlistHandlers.ts  # Playlist CRUD operations
│           └── __tests__/           # IPC handler tests
│
├── src/                         # Renderer Process (React)
│   ├── main.tsx                 # React entry point
│   ├── App.tsx                  # App shell with hooks and component integration
│   ├── App.css                  # Main app styles
│   ├── index.css                # Global CSS variables/resets
│   ├── __tests__/               # React component tests
│   │
│   ├── types/                   # TypeScript definitions
│   │   ├── electron.d.ts        # IPC type definitions (includes playlist types)
│   │   ├── playlist.ts          # Playlist-specific type definitions
│   │   └── vite-env.d.ts        # Vite environment types
│   │
│   ├── assets/                  # Images, SVGs, fonts
│   │
│   ├── components/              # UI Components (feature-based)
│   │   ├── common/              # Reusable UI primitives
│   │   │   ├── AudioVisualizer/     # Canvas-based spectrum visualizer
│   │   │   │   ├── AudioVisualizer.tsx
│   │   │   │   └── AudioVisualizer.css
│   │   │   ├── ContextMenu/         # Right-click context menu
│   │   │   │   ├── ContextMenu.tsx
│   │   │   │   └── ContextMenu.css
│   │   │   └── NotificationToast/   # Toast notifications
│   │   │       ├── NotificationToast.tsx
│   │   │       └── NotificationToast.css
│   │   │
│   │   ├── layout/              # App structure components
│   │   │   ├── TitleBar/            # Custom window title bar
│   │   │   │   ├── TitleBar.tsx
│   │   │   │   └── TitleBar.css
│   │   │   ├── Sidebar/             # Library navigation + playlists
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   └── Sidebar.css
│   │   │   └── PlaybackBar/         # Audio controls and progress
│   │   │       └── PlaybackBar.tsx
│   │   │
│   │   ├── library/             # Music library feature
│   │   │   ├── SongList/            # Song list with context menu
│   │   │   │   └── SongList.tsx
│   │   │   └── BatchScanProgress/   # Batch scan progress UI
│   │   │       ├── BatchScanProgress.tsx
│   │   │       └── BatchScanProgress.css
│   │   │
│   │   ├── playlists/           # Playlist feature (flat structure)
│   │   │   ├── PlaylistList.tsx     # Sidebar playlist section
│   │   │   ├── PlaylistList.css
│   │   │   ├── CreatePlaylistModal.tsx
│   │   │   ├── CreatePlaylistModal.css
│   │   │   └── index.ts             # Re-exports components
│   │   │
│   │   ├── settings/            # Settings feature
│   │   │   └── Settings/
│   │   │       ├── Settings.tsx
│   │   │       └── Settings.css
│   │   │
│   │   └── download/            # YouTube download feature
│   │       ├── DownloadButton/
│   │       │   ├── DownloadButton.tsx
│   │       │   └── DownloadButton.css
│   │       └── DownloadNotification/
│   │           ├── DownloadNotification.tsx
│   │           └── DownloadNotification.css
│   │
│   ├── hooks/                   # Custom React Hooks (flat structure)
│   │   ├── useAudioPlayer.ts    # Audio playback management
│   │   ├── useMusicLibrary.ts   # Music library state
│   │   ├── useSongScanner.ts    # Batch scanning logic
│   │   ├── usePlaylists.ts      # Playlist state management
│   │   └── __tests__/           # Hook tests
│   │
│   ├── services/                # API/IPC communication layer
│   │   ├── acoustid.ts          # AcoustID API client
│   │   ├── musicbrainz.ts       # MusicBrainz API client
│   │   ├── fingerprint.ts       # Fingerprint generation service
│   │   └── __tests__/           # Service tests
│   │
│   └── utils/                   # Pure utility functions
│       ├── colorExtractor.ts    # Extract colors from album art
│       ├── rateLimiter.ts       # API rate limiting
│       ├── sortMusicFiles.ts    # Sorting utilities
│       ├── pathResolver.ts      # Convert paths to file:// URLs
│       └── __tests__/           # Utility tests
│
├── vite.config.ts               # Vite + Electron build configuration
├── electron-builder.json5       # Packaging configuration
├── package.json                 # Dependencies and scripts
├── tsconfig.json                # TypeScript configuration
├── ARCHITECTURE.md              # This documentation file
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
| **`preload.ts`** | Runs in isolated context; exposes typed `electronAPI` via `contextBridge`. Maps renderer calls to `ipcRenderer.invoke/send` and registers event listeners with cleanup functions. Includes playlist API methods. |
| **`tray.ts`** | Builds system tray icon and menu (Show/Hide, Play/Pause, Quit). Updates labels based on playback state and window visibility. Forwards tray play/pause clicks to renderer. |
| **`musicScanner.ts`** | Recursively scans folders for supported audio extensions, reads tags with `music-metadata`, converts album art to base64. Provides single-file metadata read for in-place UI updates. |
| **`youtubeDownloader.ts`** | Ensures yt-dlp binary exists (platform/arch-specific download if missing). Executes downloads with audio extraction, thumbnail embedding, and metadata. Emits progress events with 10s cooldown between downloads. |
| **`settings.ts`** | Persists JSON settings (music folder, download folder) under `app.getPath('userData')`. |
| **`binaryManager.ts`** | Resolves yt-dlp binary path per platform/arch. Checks installation and version, flags corrupted binaries for redownload. Resolves ffmpeg path from asar. |
| **`fpcalcManager.ts`** | Manages fpcalc (Chromaprint) binary for audio fingerprinting. Auto-downloads platform-specific binary on first use. Runs fingerprinting in subprocess to avoid memory limits. |
| **`metadataCache.ts`** | SQLite cache keyed by file hash (path + size + mtime) to track scan status and avoid reprocessing unchanged files. |
| **`playlistDatabase.ts`** | SQLite database for playlist storage. Manages playlist CRUD operations, song ordering, and playlist-song relationships with foreign key constraints. |
| **`fileWatcher.ts`** | Monitors the music folder for real-time file changes. Uses Node.js `fs.watch` with recursive option. Debounces rapid changes and notifies renderer via IPC events. |

### File System Watcher

The application includes automatic file system watching, so the music library updates in real-time when files are added, removed, or modified.

**Architecture:**

```
┌─────────────────────────────────────────────────────────────────────┐
│                      FILE SYSTEM WATCHER FLOW                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌───────────────┐    fs.watch()    ┌─────────────────────────────┐ │
│  │  Music Folder │ ───────────────> │  fileWatcher.ts (Main)      │ │
│  │  (Recursive)  │   file events    │  - Debounces changes (500ms)│ │
│  └───────────────┘                  │  - Filters audio files only │ │
│                                     │  - Categorizes: add/remove  │ │
│                                     └──────────────┬──────────────┘ │
│                                                    │                 │
│                                     IPC: 'file-watcher-event'       │
│                                                    │                 │
│                                                    ▼                 │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  useMusicLibrary.ts (Renderer)                                  ││
│  │  - Listens for file watcher events                              ││
│  │  - 'removed': Filters files from state                          ││
│  │  - 'added'/'changed': Reads metadata, updates/adds to state     ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Event Types:**

| Event | Description | Frontend Handling |
|-------|-------------|-------------------|
| `added` | New audio file detected | Read metadata, add to library |
| `removed` | File deleted | Remove from library state |
| `changed` | File modified | Re-read metadata, update in place |

**IPC Channels:**

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `file-watcher-start` | Renderer → Main | Start watching a folder |
| `file-watcher-stop` | Renderer → Main | Stop watching |
| `file-watcher-status` | Renderer → Main | Get current watch status |
| `file-watcher-event` | Main → Renderer | File change notification |

**Key Features:**

- **Recursive Watching**: Monitors all subdirectories within the music folder
- **Debouncing**: Batches rapid file operations (500ms delay) to prevent excessive updates
- **Audio File Filtering**: Only processes supported audio extensions
- **Auto-Restart**: Watcher automatically restarts on errors
- **Lifecycle Management**: Starts on folder selection, stops on app close or folder change

**Supported Platforms:**

| Platform | Recursive Option | Notes |
|----------|-----------------|-------|
| Windows | ✅ Full support | Native `fs.watch` recursive |
| macOS | ✅ Full support | Native `fs.watch` recursive |
| Linux | ⚠️ Partial | Recursive may not work on all systems |


### Window Configuration

```typescript
win = new BrowserWindow({
  width: 820, height: 720,
  minWidth: 820, minHeight: 720,
  frame: false,                   // Remove default window frame
  titleBarStyle: 'hidden',        // macOS-specific
  backgroundColor: '#1a1a1a',
  webPreferences: {
    preload: path.join(__dirname, 'preload.mjs'),
    webSecurity: false,           // Allow file:// protocol
    allowRunningInsecureContent: true,
    devTools: true,
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
│  │  usePlaylists() → playlists, createPlaylist, addSongs, etc.   │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  Layout                                                       │  │
│  │  ──────                                                       │  │
│  │  <TitleBar />                    ← Custom window controls     │  │
│  │  <Sidebar />                     ← Library + Playlists        │  │
│  │  <DownloadButton />              ← YouTube download trigger   │  │
│  │  <SongList />                    ← Display music files        │  │
│  │  <PlaybackBar />                 ← Controls, seek, volume     │  │
│  │  <Settings />                    ← Settings modal             │  │
│  │  <DownloadNotification />        ← Active download progress   │  │
│  │  <NotificationToast />           ← Success/error messages     │  │
│  │  <CreatePlaylistModal />         ← Create new playlists       │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### UI Components

| Component | Purpose |
|-----------|---------|
| **`TitleBar.tsx`** | Custom draggable title bar for frameless window; listens for window state changes to toggle maximize/restore icon |
| **`Sidebar.tsx`** | Collapsible artist/album/playlist sections with search functionality; shows album art thumbnails; integrates PlaylistList component; filters library with active selection |
| **`SongList.tsx`** | Displays songs with metadata, album art; handles play selection; includes context menu with "Identify Song" and "Add to Playlist" options; auto-scrolls to current track; uses toast notifications for scan feedback |
| **`PlaybackBar.tsx`** | Shows current track info/art with dynamic glow border, playback controls, seek bar with audio visualizer, and volume slider |
| **`AudioVisualizer.tsx`** | Canvas-based audio spectrum analyzer with "bars" (mirrored spectrum) and "wave" (liquid waveform) modes; extracts audio data from Howler.js |
| **`DownloadButton.tsx`** | Accepts YouTube URL, triggers download IPC, disables during active download |
| **`DownloadNotification.tsx`** | Floating banner for active download progress/title |
| **`NotificationToast.tsx`** | General-purpose toasts (success/warning/info/error) with auto-dismiss |
| **`Settings.tsx`** | Modal for folder selection, binary status, platform info, batch scan, and visualizer mode toggle |
| **`ContextMenu.tsx`** | Generic right-click context menu with icons, dividers, and nested items; used for song actions including playlist additions |
| **`PlaylistList.tsx`** | Sidebar component displaying user playlists with create/delete buttons; shows playlist names and song counts; supports active selection state |
| **`CreatePlaylistModal.tsx`** | Modal dialog for creating new playlists with name input, optional description, and animated backdrop; glassmorphism design |

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

#### `usePlaylists.ts` - Playlist Management

Manages playlist state and CRUD operations in the renderer process.

**State:**
- `playlists` - Array of all user playlists
- `activePlaylist` - Currently selected playlist with songs loaded
- `loading` - Loading state for async operations

**Actions:**
- `createPlaylist(name, description?)` - Create a new playlist
- `deletePlaylist(playlistId)` - Delete a playlist and all its songs
- `renamePlaylist(playlistId, newName)` - Rename a playlist
- `addSongsToPlaylist(playlistId, filePaths[])` - Add songs to a playlist
- `removeSongFromPlaylist(playlistId, filePath)` - Remove a song from playlist
- `loadPlaylist(playlistId)` - Load a playlist with its songs
- `clearActivePlaylist()` - Clear the active playlist selection
- `refreshPlaylists()` - Reload all playlists from database

**Integration with App.tsx:**

```
┌─────────────────────────────────────────────────────────────┐
│  App.tsx                                                     │
│       │                                                      │
│       ├──► usePlaylists({ musicFiles, onShowNotification }) │
│       │         │                                            │
│       │         ├──► Loads playlists on mount               │
│       │         ├──► Provides CRUD functions to components  │
│       │         └──► Resolves file paths to MusicFile objs  │
│       │                                                      │
│       ├──► <Sidebar playlists={playlists} />                │
│       ├──► <SongList onAddToPlaylist={addSongsToPlaylist} />│
│       └──► <CreatePlaylistModal onCreate={createPlaylist} />│
└─────────────────────────────────────────────────────────────┘
```

### Utilities & Services

| File | Folder | Purpose |
|------|--------|---------|
| **`pathResolver.ts`** | `utils/` | Normalizes OS paths to `file:///` URLs for Howler/Electron playback |
| **`sortMusicFiles.ts`** | `utils/` | Pure sorting helpers for title, artist, track, date added |
| **`colorExtractor.ts`** | `utils/` | Extracts dominant colors from album art for dynamic UI theming |
| **`rateLimiter.ts`** | `utils/` | API delay utilities to respect rate limits |
| **`fingerprint.ts`** | `services/` | IPC wrapper for Main Process fpcalc fingerprinting with circuit breaker |
| **`acoustid.ts`** | `services/` | Calls AcoustID API via IPC |
| **`musicbrainz.ts`** | `services/` | Queries MusicBrainz, scores releases, generates cover-art URL fallbacks |

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
    ├── fingerprintHandlers.ts # Audio fingerprinting (fpcalc)
    └── playlistHandlers.ts  # Playlist CRUD operations
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
| **playlistHandlers** | `playlist-create` | invoke | Create a new playlist |
| | `playlist-delete` | invoke | Delete a playlist |
| | `playlist-rename` | invoke | Rename a playlist |
| | `playlist-update-description` | invoke | Update playlist description |
| | `playlist-update-cover` | invoke | Update playlist cover art |
| | `playlist-get-all` | invoke | Get all playlists |
| | `playlist-get-by-id` | invoke | Get a single playlist by ID |
| | `playlist-get-songs` | invoke | Get song paths in a playlist |
| | `playlist-add-songs` | invoke | Add songs to a playlist |
| | `playlist-remove-song` | invoke | Remove a song from a playlist |
| | `playlist-reorder-songs` | invoke | Reorder songs in a playlist |
| | `playlist-is-song-in` | invoke | Check if a song is in a playlist |
| | `playlist-get-containing-song` | invoke | Get all playlists containing a song |
| | `playlist-cleanup-missing` | invoke | Remove non-existent files from playlists |

### Renderer Type Safety

`src/electron.d.ts` provides TypeScript definitions for `window.electronAPI`. It is **compile-time only** and doesn't enforce runtime checks. Keep it in sync with `preload.ts` to avoid runtime errors.

---

## Playlist System

The playlist system enables users to create, manage, and play custom collections of songs. It uses SQLite for persistent storage and follows the same IPC pattern as other features.

### Architecture Overview

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                         PLAYLIST SYSTEM ARCHITECTURE                           │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │                           RENDERER PROCESS                                │  │
│  │                                                                           │  │
│  │   App.tsx                                                                 │  │
│  │      │                                                                    │  │
│  │      ├──► usePlaylists()  ←──────────────────────────────────────────┐   │  │
│  │      │        │                                                       │   │  │
│  │      │        ├──► State: playlists[], activePlaylist                │   │  │
│  │      │        ├──► Actions: create, delete, addSongs, removeSong     │   │  │
│  │      │        └──► Resolves filePaths → MusicFile objects            │   │  │
│  │      │                                                                │   │  │
│  │      ├──► Sidebar                                                     │   │  │
│  │      │        └──► PlaylistList                                       │   │  │
│  │      │                ├──► Shows all playlists with song counts      │   │  │
│  │      │                ├──► Create button → CreatePlaylistModal       │   │  │
│  │      │                └──► Delete button (with confirmation)         │   │  │
│  │      │                                                                │   │  │
│  │      ├──► SongList                                                    │   │  │
│  │      │        └──► ContextMenu                                        │   │  │
│  │      │                ├──► "Add to [Playlist Name]" (x5)              │   │  │
│  │      │                └──► "Create playlist with song"               │   │  │
│  │      │                                                                │   │  │
│  │      └──► CreatePlaylistModal                                         │   │  │
│  │               ├──► Name input (required)                             │   │  │
│  │               ├──► Description textarea (optional)                   │   │  │
│  │               └──► onCreate → createPlaylist() + addSongs()          │   │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                       │                                        │
│                                       │ IPC (invoke)                           │
│                                       ▼                                        │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │                            MAIN PROCESS                                   │  │
│  │                                                                           │  │
│  │   preload.ts                                                              │  │
│  │      └──► Exposes playlistCreate, playlistDelete, playlistAddSongs, etc. │  │
│  │                                                                           │  │
│  │   ipc/modules/playlistHandlers.ts                                         │  │
│  │      └──► Registers IPC handlers for all playlist operations             │  │
│  │                  │                                                        │  │
│  │                  ▼                                                        │  │
│  │   playlistDatabase.ts                                                     │  │
│  │      ├──► Initializes SQLite database on first use                       │  │
│  │      ├──► Creates tables: playlists, playlist_songs                      │  │
│  │      ├──► CRUD operations with transactions                              │  │
│  │      └──► Position-based ordering with gap reorder                       │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                       │                                        │
│                                       ▼                                        │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │                         SQLite DATABASE                                   │  │
│  │                                                                           │  │
│  │   Location: %APPDATA%/music-sync-app/playlists.db                        │  │
│  │                                                                           │  │
│  │   ┌─────────────────────────────────────────────────────────────────┐    │  │
│  │   │                                                                  │    │  │
│  │   │   playlists                      playlist_songs                  │    │  │
│  │   │   ┌─────────────────┐            ┌──────────────────────────┐   │    │  │
│  │   │   │ id (PK)         │            │ playlistId (PK, FK)      │   │    │  │
│  │   │   │ name            │───────────►│ filePath (PK)            │   │    │  │
│  │   │   │ description     │   1:N      │ position                 │   │    │  │
│  │   │   │ coverArtPath    │            │ addedAt                  │   │    │  │
│  │   │   │ createdAt       │            └──────────────────────────┘   │    │  │
│  │   │   │ updatedAt       │                                            │    │  │
│  │   │   └─────────────────┘                                            │    │  │
│  │   │                                                                  │    │  │
│  │   └─────────────────────────────────────────────────────────────────┘    │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────────┘
```

### Database Schema

**Database Location:**
- Windows: `%APPDATA%/music-sync-app/playlists.db`
- macOS: `~/Library/Application Support/music-sync-app/playlists.db`
- Linux: `~/.config/music-sync-app/playlists.db`

**Table: `playlists`**

```sql
CREATE TABLE playlists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,  -- Unique playlist identifier
  name TEXT NOT NULL,                     -- Playlist display name
  description TEXT,                       -- Optional description
  coverArtPath TEXT,                      -- Optional custom cover art path
  createdAt INTEGER NOT NULL,             -- Unix timestamp of creation
  updatedAt INTEGER NOT NULL              -- Unix timestamp of last modification
);
```

**Table: `playlist_songs`**

```sql
CREATE TABLE playlist_songs (
  playlistId INTEGER NOT NULL,            -- Reference to playlists.id
  filePath TEXT NOT NULL,                 -- Full path to the music file
  position INTEGER NOT NULL,              -- 0-based order in playlist
  addedAt INTEGER NOT NULL,               -- Unix timestamp when added
  
  PRIMARY KEY (playlistId, filePath),     -- Composite key (no duplicates)
  FOREIGN KEY (playlistId) REFERENCES playlists(id) ON DELETE CASCADE
);

-- Index for efficient playlist song retrieval
CREATE INDEX idx_playlist_songs_playlist ON playlist_songs(playlistId);
CREATE INDEX idx_playlist_songs_position ON playlist_songs(playlistId, position);
```

**Entity Relationship Diagram:**

```
┌──────────────────────────┐         ┌──────────────────────────────────┐
│        playlists         │         │         playlist_songs           │
├──────────────────────────┤         ├──────────────────────────────────┤
│ • id           INTEGER   │ ◄───┐   │ • playlistId   INTEGER (FK)      │
│ • name         TEXT      │     │   │ • filePath     TEXT              │
│ • description  TEXT      │     └───│   (PK: playlistId + filePath)    │
│ • coverArtPath TEXT      │   1:N   │ • position     INTEGER           │
│ • createdAt    INTEGER   │         │ • addedAt      INTEGER           │
│ • updatedAt    INTEGER   │         └──────────────────────────────────┘
└──────────────────────────┘                            │
                                                        │
                                                        ▼
                                           ┌────────────────────────────┐
                                           │     Music File System      │
                                           │                            │
                                           │  filePath points to actual │
                                           │  .mp3, .flac, .m4a files  │
                                           │  on the local filesystem   │
                                           └────────────────────────────┘
```

### Data Flow: Creating a Playlist

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CREATE PLAYLIST FLOW                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   User Action                                                                │
│   ───────────                                                                │
│   Click "+" button in Playlist section                                       │
│       │                                                                      │
│       ▼                                                                      │
│   CreatePlaylistModal opens                                                  │
│       │                                                                      │
│       ├──► User enters: name="My Favorites"                                 │
│       ├──► User enters: description="Songs I love" (optional)              │
│       └──► User clicks "Create Playlist"                                    │
│                │                                                             │
│                ▼                                                             │
│   App.tsx: onCreate handler                                                  │
│       │                                                                      │
│       ├──► await createPlaylist("My Favorites", "Songs I love")             │
│       │         │                                                            │
│       │         ▼                                                            │
│       │   usePlaylists.createPlaylist()                                      │
│       │         │                                                            │
│       │         ▼                                                            │
│       │   window.electronAPI.playlistCreate(name, description)              │
│       │         │                                                            │
│       │         │  IPC invoke: 'playlist-create'                            │
│       │         ▼                                                            │
│       │   playlistHandlers.ts → playlistDatabase.createPlaylist()           │
│       │         │                                                            │
│       │         ▼                                                            │
│       │   SQLite INSERT INTO playlists (name, description, ...)             │
│       │         │                                                            │
│       │         ▼                                                            │
│       │   Returns { success: true, playlist: { id: 1, name: "..." } }       │
│       │                                                                      │
│       ├──► If pendingSongs.length > 0:                                      │
│       │         await addSongsToPlaylist(playlist.id, pendingSongs)         │
│       │                                                                      │
│       └──► setPlaylists([...playlists, newPlaylist])                        │
│                │                                                             │
│                ▼                                                             │
│   UI updates: PlaylistList re-renders with new playlist                      │
│   Toast shows: "Playlist 'My Favorites' created"                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow: Adding Song to Playlist

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ADD SONG TO PLAYLIST FLOW                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   User Action                                                                │
│   ───────────                                                                │
│   Right-click on song → Select "Add to 'My Favorites'"                      │
│       │                                                                      │
│       ▼                                                                      │
│   ContextMenu onClick handler                                                │
│       │                                                                      │
│       ▼                                                                      │
│   onAddToPlaylist(playlistId: 1, filePaths: ["C:/music/song.mp3"])         │
│       │                                                                      │
│       ▼                                                                      │
│   usePlaylists.addSongsToPlaylist(1, ["C:/music/song.mp3"])                 │
│       │                                                                      │
│       ├──► window.electronAPI.playlistAddSongs(1, filePaths)                │
│       │         │                                                            │
│       │         │  IPC invoke: 'playlist-add-songs'                         │
│       │         ▼                                                            │
│       │   playlistHandlers.ts → playlistDatabase.addSongsToPlaylist()       │
│       │         │                                                            │
│       │         ▼                                                            │
│       │   ┌─────────────────────────────────────────────────────────────┐   │
│       │   │  SQLite Transaction:                                         │   │
│       │   │                                                              │   │
│       │   │  1. SELECT MAX(position) FROM playlist_songs                 │   │
│       │   │     WHERE playlistId = 1                                     │   │
│       │   │     → maxPos = 3 (existing songs: 0, 1, 2, 3)               │   │
│       │   │                                                              │   │
│       │   │  2. INSERT OR IGNORE INTO playlist_songs                     │   │
│       │   │     (playlistId, filePath, position, addedAt)               │   │
│       │   │     VALUES (1, 'C:/music/song.mp3', 4, 1702500000)          │   │
│       │   │                                                              │   │
│       │   │  3. UPDATE playlists SET updatedAt = NOW()                  │   │
│       │   │     WHERE id = 1                                             │   │
│       │   └─────────────────────────────────────────────────────────────┘   │
│       │                                                                      │
│       ├──► Update local state: playlist.songCount++                         │
│       │                                                                      │
│       └──► If activePlaylist.id === playlistId: reload playlist             │
│                                                                              │
│   Toast shows: "Added 1 song to 'My Favorites'"                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow: Viewing Playlist Songs

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          VIEW PLAYLIST FLOW                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   User Action                                                                │
│   ───────────                                                                │
│   Click on "My Favorites" in sidebar                                        │
│       │                                                                      │
│       ▼                                                                      │
│   Sidebar.handlePlaylistClick(playlistId: 1)                                │
│       │                                                                      │
│       ├──► setSelectedView('playlist:1')                                    │
│       │                                                                      │
│       └──► loadPlaylist(1)                                                  │
│                │                                                             │
│                ▼                                                             │
│   usePlaylists.loadPlaylist(1)                                              │
│       │                                                                      │
│       ├──► playlistGetById(1) → Playlist metadata                           │
│       │                                                                      │
│       ├──► playlistGetSongs(1) → string[] of filePaths                      │
│       │         │                                                            │
│       │         ▼                                                            │
│       │   ["C:/music/song1.mp3", "C:/music/song2.flac", ...]               │
│       │                                                                      │
│       └──► Resolve filePaths to MusicFile objects:                          │
│                │                                                             │
│                ▼                                                             │
│           filePaths.map(path => musicFiles.find(f => f.path === path))      │
│                │                                                             │
│                ▼                                                             │
│           setActivePlaylist({                                                │
│             ...playlist,                                                     │
│             songs: [MusicFile, MusicFile, ...]                              │
│           })                                                                 │
│                │                                                             │
│                ▼                                                             │
│   filteredMusicFiles in App.tsx:                                            │
│       selectedView.startsWith('playlist:') && activePlaylist                │
│       → returns activePlaylist.songs                                        │
│                │                                                             │
│                ▼                                                             │
│   SongList renders with playlist songs (ordered by position)                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Playlist TypeScript Types

```typescript
// src/types/electron.d.ts

interface Playlist {
  id: number
  name: string
  description: string | null
  coverArtPath: string | null
  songCount: number
  totalDuration: number
  createdAt: number
  updatedAt: number
}

interface PlaylistWithSongs extends Playlist {
  songs: MusicFile[]  // Resolved MusicFile objects
}

// src/types/playlist.ts

interface PlaylistSong {
  playlistId: number
  filePath: string
  position: number
  addedAt: number
}

interface PlaylistCreateResponse {
  success: boolean
  playlist?: Playlist
  error?: string
}
```

### UI Component Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PLAYLIST UI COMPONENTS                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   src/components/playlists/          # Flat structure (no nested folders)   │
│   ├── index.ts                       # Re-exports: PlaylistList,            │
│   │                                  #             CreatePlaylistModal      │
│   ├── PlaylistList.tsx               # Sidebar playlist section             │
│   ├── PlaylistList.css               # Component styles                     │
│   ├── CreatePlaylistModal.tsx        # Modal for creating playlists         │
│   └── CreatePlaylistModal.css        # Glassmorphism styling                │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  PlaylistList Component                                              │   │
│   ├─────────────────────────────────────────────────────────────────────┤   │
│   │  Props:                                                              │   │
│   │  • playlists: Playlist[]                                            │   │
│   │  • selectedPlaylistId: number | null                                │   │
│   │  • onPlaylistClick: (id) => void                                    │   │
│   │  • onCreateNew: () => void                                          │   │
│   │  • onDeletePlaylist?: (id) => void                                  │   │
│   ├─────────────────────────────────────────────────────────────────────┤   │
│   │  Renders:                                                            │   │
│   │  • Header: "Playlists" + "+" create button                          │   │
│   │  • List of playlist items with:                                     │   │
│   │    - Icon (🎵 or cover art thumbnail)                               │   │
│   │    - Playlist name                                                   │   │
│   │    - Song count ("5 songs")                                         │   │
│   │    - Delete button (on hover)                                       │   │
│   │  • Empty state: "No playlists yet"                                  │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  CreatePlaylistModal Component                                       │   │
│   ├─────────────────────────────────────────────────────────────────────┤   │
│   │  Props:                                                              │   │
│   │  • isOpen: boolean                                                   │   │
│   │  • onClose: () => void                                               │   │
│   │  • onCreate: (name, description?) => Promise<any>                   │   │
│   ├─────────────────────────────────────────────────────────────────────┤   │
│   │  Features:                                                           │   │
│   │  • Animated overlay with blur backdrop                               │   │
│   │  • Auto-focus on name input when opened                              │   │
│   │  • ESC to close, Enter to submit                                    │   │
│   │  • Disabled submit when name is empty                               │   │
│   │  • Loading state during creation                                     │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   Import Usage:                                                              │
│   ─────────────                                                              │
│   import { PlaylistList, CreatePlaylistModal } from './components/playlists'│
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Position-Based Ordering

Songs in a playlist maintain order via the `position` column:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Playlist: "My Favorites" (id: 1)                                            │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  playlist_songs table:                                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ playlistId │ filePath                        │ position │ addedAt       │ │
│  ├────────────┼─────────────────────────────────┼──────────┼───────────────┤ │
│  │     1      │ C:/music/song_a.mp3             │    0     │ 1702500000    │ │
│  │     1      │ C:/music/song_b.flac            │    1     │ 1702500001    │ │
│  │     1      │ C:/music/song_c.m4a             │    2     │ 1702500002    │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  Operations:                                                                  │
│  ───────────────                                                              │
│                                                                               │
│  ADD SONG:                                                                    │
│  • position = MAX(position) + 1  →  New song at position 3                   │
│                                                                               │
│  REMOVE SONG (position 1):                                                    │
│  • DELETE WHERE position = 1                                                  │
│  • RENUMBER remaining: 0, 2 → 0, 1 (close the gap)                          │
│                                                                               │
│  REORDER (drag song from position 0 to position 2):                          │
│  • Update all positions in a transaction                                     │
│  • API: playlistReorderSongs(id, [{filePath, newPosition}, ...])            │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Error Handling & Edge Cases

| Scenario | Handling |
|----------|----------|
| **Duplicate song** | `INSERT OR IGNORE` - silently skips if song already in playlist |
| **Deleted music file** | `playlistCleanupMissing()` removes entries for files that no longer exist on disk |
| **Playlist deletion** | `ON DELETE CASCADE` automatically removes all `playlist_songs` entries |
| **Empty playlist** | Allowed - displays properly in UI with "0 songs" |
| **Long playlist name** | Limited to 100 characters via frontend validation |
| **Missing music files** | Songs are stored by `filePath` and resolved at load time; missing files are filtered out |

---

## Core Flows

### App Startup

1. `app.whenReady()` → `registerIpcHandlers()` → `setupWindowEvents()` → `createWindow()` → `createTray()`
2. Removes menu, registers devtools shortcut, loads renderer (dev: `http://localhost:5173`, prod: `file://…/index.html`)

### Renderer Boot

1. `App.tsx` mounts → hooks initialize (`useMusicLibrary`, `useAudioPlayer`, `useSongScanner`, `usePlaylists`)
2. IPC listeners attach (download progress/title, binary progress, window-state, tray play/pause)
3. `usePlaylists` loads all playlists from database
4. UI renders title bar, sidebar (with playlists), list, playback bar, settings, notifications

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

## Visual Enhancements

### Dynamic Album Art Glow

The playback bar features an animated glow effect around the album art that dynamically adapts to the currently playing album's colors.

**Implementation:**
- **Color Extraction** (`src/utils/colorExtractor.ts`): Samples album art using canvas pixel analysis to extract dominant colors (primary, secondary, accent, background)
- **Conic Gradient Border**: Uses CSS `conic-gradient` with extracted colors for a spinning light effect
- **Ambient Animation** (`@keyframes ambient-glow`): 16-second animation combining:
  - Slow 360° rotation
  - Subtle scale breathing (0.98 → 1.02)
  - Pulsing blur intensity
  - Varying opacity
- **Interactivity**: Animation pauses on hover; only active when music is playing

```css
.glow-border {
  background: conic-gradient(from 0deg, primary, secondary, accent, primary);
  animation: ambient-glow 16s ease-in-out infinite;
  filter: blur(8px);
}
```

### Audio Visualizer

A canvas-based real-time audio spectrum analyzer that sits behind the seek bar.

**Location:** `src/components/common/AudioVisualizer/`

**Integration with HTML5 Audio:**
Since Howler.js uses `html5: true` for file:// playback in Electron, the visualizer creates a `MediaElementAudioSourceNode` from Howler's internal `<audio>` element:

```typescript
// Access internal audio element
const audioElement = howl._sounds[0]._node as HTMLAudioElement

// Create Web Audio API source
const source = Howler.ctx.createMediaElementSource(audioElement)
source.connect(analyser)
analyser.connect(Howler.ctx.destination)
```

**Visualization Modes:**

| Mode | Description |
|------|-------------|
| `bars` | Mirrored spectrum analyzer - frequency bars spread from center outward with glow effects |
| `wave` | Liquid waveform - filled area under the waveform curve with gradient and stroke overlay |
| `off` | Disabled (returns null) |

**Technical Details:**
- Uses `requestAnimationFrame` for smooth 60fps animation
- `AnalyserNode.fftSize = 256` → 128 frequency bins
- Canvas scales with `devicePixelRatio` for crisp rendering on HiDPI displays
- Colors derived from album art via `colorExtractor`
- Mode toggleable from Settings panel

**Memory Management:**
- Global singleton `AnalyserNode` shared across song changes
- Source node stored on audio element to prevent re-creation
- Animation frame cancelled on unmount

### Enhanced Sidebar

The sidebar has been upgraded with collapsible sections, search functionality, and visual improvements.

**Features:**

| Feature | Description |
|---------|-------------|
| **Collapsible Sections** | Click Artists/Albums header to collapse/expand; rotating arrow indicator |
| **Search** | Inline search box appears when section has >5 items; real-time filtering |
| **Album Art Thumbnails** | 24×24px album covers displayed instead of emoji icons |
| **Flexible Layout** | Uses CSS flexbox with `flex: 1` for expanded sections; proper overflow scrolling |

**CSS Architecture:**
```css
.sidebar-section.expanded {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.sidebar-section.collapsed {
  flex: 0 0 auto;
}

.sidebar-list {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}
```

**State Management:**
- `artistsCollapsed` / `albumsCollapsed` - Boolean state for section visibility
- `artistSearch` / `albumSearch` - Search query strings
- Filtered lists computed with `useMemo` for performance

### Modern Seek Bar & Volume Slider

Redesigned sliders with gradient fills, glow effects, and smooth animations.

**Seek Bar Features:**
- Gradient track: `#667eea → #764ba2 → #f093fb`
- Circular handle with glow on hover/drag
- Handle appears on container hover
- Thinner 4px profile

**Volume Slider Features:**
- Matching gradient design
- Compact vertical layout
- Handle scales up on hover

---

## Known Limitations & Future Work

- **Library UX:** Search bar added; no multi-select for bulk actions yet.
- **Downloads:** No download queue/history; single-link flow with fixed delay.
- **Cover art:** Downloaded art cleaned immediately after embedding; backup cleanup at 30 days.
- **File System Watching:** ✅ Implemented! Auto-detects new/changed/removed files (Linux recursive watching may be limited).
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

---

## 📚 Electron Backend Reference

This section provides detailed documentation for every file in the `electron/` folder. Each file is explained with its purpose and all exported functions.

---

### 📁 `electron/main.ts`

**Purpose**: The entry point for the Electron main process. Initializes the application.

**What it does**:
- Removes the default menu bar
- Registers all IPC handlers
- Sets up window event handlers  
- Registers keyboard shortcuts (F12, Ctrl+Shift+I for dev tools)
- Initializes the metadata cache database
- Creates the main window and system tray

**Flow**:
```
app.whenReady() 
    → initializeDatabase()
    → createWindow()
    → createTray()
```

**No exported functions** - this is the entry point.

---

### 📁 `electron/window.ts`

**Purpose**: Creates and manages the main application window.

| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `createWindow()` | none | `BrowserWindow` | Creates the main app window with custom settings (frameless, dark theme, preload script) |
| `setupWindowEvents()` | none | `void` | Sets up window lifecycle events (close, activate for macOS dock) |

**Window Configuration**:
- Size: 820×720 (min), resizable
- Frame: Hidden (custom title bar)
- Background: `#1a1a1a`
- Preload: `preload.mjs`
- Dev tools: Enabled

---

### 📁 `electron/preload.ts`

**Purpose**: The secure bridge between main process and renderer. Exposes a typed `electronAPI` to the React frontend.

**Exposed API Methods** (via `window.electronAPI`):

| Method | Description |
|--------|-------------|
| **Music Scanning** | |
| `scanMusicFolder(folderPath)` | Scans a folder for music files with metadata |
| `selectMusicFolder()` | Opens folder picker dialog |
| `readSingleFileMetadata(filePath)` | Reads metadata for one file |
| **Settings** | |
| `getSettings()` | Gets stored app settings |
| `saveSettings(settings)` | Saves app settings |
| `selectDownloadFolder()` | Opens folder picker for downloads |
| **Binaries** | |
| `getBinaryStatuses()` | Checks yt-dlp installation status |
| `getPlatformInfo()` | Returns OS platform and architecture |
| **Playback Control** | |
| `onTrayPlayPause(callback)` | Listens for tray play/pause commands |
| `sendPlaybackState(isPlaying)` | Updates tray with playback state |
| **Window Control** | |
| `minimizeWindow()` | Minimizes the window |
| `maximizeWindow()` | Toggles maximize/restore |
| `closeWindow()` | Closes the window |
| `onWindowStateChanged(callback)` | Listens for maximize/restore events |
| **YouTube Download** | |
| `downloadYouTube(url, outputPath)` | Downloads audio from YouTube |
| `onDownloadProgress(callback)` | Listens for download progress |
| `onBinaryDownloadProgress(callback)` | Listens for yt-dlp download progress |
| `onDownloadTitle(callback)` | Receives video title |
| **API Calls** | |
| `lookupAcoustid(fingerprint, duration)` | Queries AcoustID for song match |
| `lookupMusicBrainz(mbid)` | Gets recording data from MusicBrainz |
| `downloadImage(url, filePath)` | Downloads an image to disk |
| `downloadImageWithFallback(urls, filePath)` | Downloads image with fallback URLs |
| **Fingerprinting** | |
| `fingerprintEnsureReady()` | Downloads fpcalc if needed |
| `generateFingerprint(filePath)` | Generates audio fingerprint |
| `generateFingerprintsBatch(filePaths)` | Batch fingerprinting |
| `fingerprintGetPoolInfo()` | Gets worker pool status |
| `onFingerprintBatchProgress(callback)` | Listens for batch progress |
| **Cache** | |
| `cacheGetFileStatus(filePath)` | Checks if file was scanned |
| `cacheMarkFileScanned(...)` | Records scan result in database |
| `cacheGetBatchStatus(filePaths)` | Batch status check |
| `cacheGetUnscannedFiles(filePaths)` | Filters to unscanned files |
| `cacheGetStatistics()` | Gets scan counts |
| **Playlists** | |
| `playlistGetAll()` | Gets all playlists |
| `playlistCreate(name, description)` | Creates a new playlist |
| `playlistDelete(id)` | Deletes a playlist |
| `playlistAddSongs(id, filePaths)` | Adds songs to playlist |
| `playlistRemoveSong(id, filePath)` | Removes a song |
| `playlistGetSongPaths(id)` | Gets song paths in playlist |
| `playlistRename(id, newName)` | Renames a playlist |

---

### 📁 `electron/tray.ts`

**Purpose**: Creates and manages the system tray icon with context menu.

| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `createTray()` | none | `Tray` | Creates the tray icon with context menu (Show/Hide, Play/Pause, Quit) |
| `updateTrayMenu()` | none | `void` | Refreshes the tray menu with current state |
| `updatePlaybackState(playing)` | `boolean` | `void` | Updates the Play/Pause label |
| `updateWindowVisibility(_visible)` | `boolean` | `void` | Updates the Show/Hide label |
| `getTray()` | none | `Tray | null` | Returns the current tray instance |

**Tray Menu Items**:
1. **Show/Hide** - Toggles window visibility
2. **Play/Pause** - Sends command to renderer
3. **Quit** - Exits the application

---

### 📁 `electron/musicScanner.ts`

**Purpose**: Scans directories for music files and extracts ID3 metadata.

| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `scanMusicFiles(directoryPath)` | `string` | `Promise<MusicFile[]>` | Recursively scans directory for music files, extracts metadata from each |
| `readSingleFileMetadata(filePath)` | `string` | `Promise<MusicFile \| null>` | Reads metadata for a single file (used after cover art is written) |

**MusicFile Interface**:
```typescript
interface MusicFile {
  path: string           // Full file path
  name: string           // Filename
  extension: string      // e.g., ".mp3"
  size: number           // Bytes
  dateAdded?: number     // Modification timestamp
  metadata?: {
    title?: string
    artist?: string
    album?: string
    albumArtist?: string
    genre?: string[]
    year?: number
    track?: { no: number; of: number }
    disk?: { no: number; of: number }
    duration?: number
    albumArt?: string    // Base64 data URL
  }
}
```

**Supported Extensions**: `.mp3`, `.flac`, `.wav`, `.m4a`, `.aac`, `.ogg`, `.opus`, `.wma`, `.aiff`, `.mp4`, `.m4p`, `.amr`

---

### 📁 `electron/youtubeDownloader.ts`

**Purpose**: Downloads audio from YouTube using yt-dlp. Auto-downloads the binary if needed.

| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `getYtDlpWrap(onBinaryProgress?)` | callback? | `Promise<YTDlpWrap>` | Gets or initializes yt-dlp-wrap, downloads binary if needed |
| `downloadYouTubeAudio(options)` | `DownloadOptions` | `Promise<{success, filePath?, error?, title?}>` | Downloads audio from YouTube URL |
| `getVideoTitle(url, ytDlp)` | url, instance | `Promise<string>` | Fetches video title before download |
| `checkBinaryVersion(binaryPath, onProgress?)` | path, callback? | `Promise<{isUpToDate, versions}>` | Checks if yt-dlp is up to date |
| `downloadBinaryWithProgress(binaryPath, onProgress?)` | path, callback? | `Promise<void>` | Downloads yt-dlp binary with progress |
| `getInstalledVersion(binaryPath)` | `string` | `Promise<string \| null>` | Gets installed yt-dlp version |
| `getLatestVersion()` | none | `Promise<string \| null>` | Gets latest version from GitHub |
| `getAssetNameForPlatform()` | none | `string \| null` | Returns correct binary name for OS |
| `findAssetForPlatform(assets)` | `any[]` | `any \| null` | Finds correct download asset from GitHub release |

**Download Options**:
```typescript
interface DownloadOptions {
  url: string
  outputPath: string
  onProgress?: (progress: DownloadProgress) => void
  onBinaryProgress?: (progress: BinaryDownloadProgress) => void
  onTitleReceived?: (title: string) => void
}
```

---

### 📁 `electron/settings.ts`

**Purpose**: Persists user settings to a JSON config file.

| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `getStoredSettings()` | none | `AppSettings` | Reads settings from config file |
| `saveSettings(settings)` | `AppSettings` | `void` | Writes settings to config file |
| `getStoredMusicFolder()` | none | `string \| null` | Gets stored music folder path |
| `getStoredDownloadFolder()` | none | `string \| null` | Gets stored download folder path |

**AppSettings Interface**:
```typescript
interface AppSettings {
  musicFolderPath: string | null
  downloadFolderPath: string | null
}
```

**Config Location**: `{userData}/app-config.json`

---

### 📁 `electron/binaryManager.ts`

**Purpose**: Checks status of external binaries (currently yt-dlp).

| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `getYtDlpStatus()` | none | `Promise<BinaryStatus>` | Checks if yt-dlp is installed, gets version info |
| `getAllBinaryStatuses()` | none | `Promise<BinaryStatus[]>` | Gets status for all managed binaries |

**BinaryStatus Interface**:
```typescript
interface BinaryStatus {
  name: string              // "yt-dlp"
  installed: boolean        // true if working
  version: string | null    // e.g., "2024.12.06"
  path: string | null       // Full path to binary
  latestVersion: string | null  // From GitHub
  needsUpdate: boolean      // true if outdated
}
```

---

### 📁 `electron/fpcalcManager.ts`

**Purpose**: Manages the fpcalc (Chromaprint) binary for audio fingerprinting.

| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `getFpcalcPath()` | none | `string` | Returns path to fpcalc binary |
| `isFpcalcInstalled()` | none | `Promise<boolean>` | Checks if fpcalc exists and works |
| `downloadFpcalc(onProgress?)` | callback? | `Promise<boolean>` | Downloads and extracts fpcalc |
| `ensureFpcalc(onProgress?)` | callback? | `Promise<boolean>` | Ensures fpcalc is available, downloads if needed |
| `generateFingerprintWithFpcalc(filePath)` | `string` | `Promise<FingerprintResult \| null>` | Generates fingerprint using fpcalc |

**FingerprintResult**:
```typescript
interface FingerprintResult {
  fingerprint: string   // Chromaprint fingerprint
  duration: number      // Seconds
}
```

---

### 📁 `electron/metadataCache.ts`

**Purpose**: SQLite database for tracking which files have been scanned/fingerprinted.

| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `initializeDatabase()` | none | `Database` | Opens/creates the SQLite database |
| `closeDatabase()` | none | `void` | Closes database connection |
| `generateFileHash(filePath)` | `string` | `string \| null` | Creates hash from path+size+mtime for change detection |
| `getFileScanStatus(filePath)` | `string` | `ScanStatusType` | Returns scan status for a file |
| `isFileScanned(filePath)` | `string` | `boolean` | Quick check if file was scanned |
| `markFileScanned(filePath, mbid, hasMetadata)` | path, mbid?, bool | `boolean` | Records scan result |
| `getBatchScanStatus(filePaths)` | `string[]` | `Map<string, ScanStatusType>` | Batch status check |
| `getUnscannedFiles(filePaths)` | `string[]` | `string[]` | Filters to unscanned/changed files |
| `getScanStatistics()` | none | `{total, withMetadata, withoutMetadata}` | Gets scan counts |
| `cleanupOrphanedEntries()` | none | `number` | Removes entries for deleted files |
| `getCachedEntry(filePath)` | `string` | `FileScanStatus \| null` | Gets full cached entry |
| `clearCache()` | none | `void` | Deletes all cache entries |

**ScanStatusType**: `'unscanned' | 'scanned-tagged' | 'scanned-no-match' | 'file-changed'`

---

### 📁 `electron/playlistDatabase.ts`

**Purpose**: SQLite database for storing playlists and their songs.

| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `initializePlaylistDatabase()` | none | `Database` | Opens/creates the playlist database |
| `closePlaylistDatabase()` | none | `void` | Closes database connection |
| `createPlaylist(name, description?)` | name, desc? | `Playlist \| null` | Creates a new playlist |
| `deletePlaylist(playlistId)` | `number` | `boolean` | Deletes playlist and its songs |
| `renamePlaylist(playlistId, newName)` | id, name | `boolean` | Renames a playlist |
| `updatePlaylistDescription(id, desc)` | id, desc | `boolean` | Updates description |
| `updatePlaylistCoverArt(id, path)` | id, path | `boolean` | Sets cover art path |
| `getAllPlaylists()` | none | `Playlist[]` | Gets all playlists with song counts |
| `getPlaylistById(playlistId)` | `number` | `Playlist \| null` | Gets single playlist |
| `getPlaylistSongPaths(playlistId)` | `number` | `string[]` | Gets ordered song paths |
| `addSongsToPlaylist(playlistId, filePaths)` | id, paths | `boolean` | Adds songs to playlist |
| `removeSongFromPlaylist(playlistId, filePath)` | id, path | `boolean` | Removes a song |
| `reorderPlaylistSongs(id, newOrder)` | id, order | `boolean` | Reorders songs (drag-drop) |
| `isSongInPlaylist(playlistId, filePath)` | id, path | `boolean` | Checks if song is in playlist |
| `getPlaylistsContainingSong(filePath)` | `string` | `Playlist[]` | Finds playlists with a song |
| `cleanupMissingSongs()` | none | `number` | Removes songs that no longer exist |

**Playlist Interface**:
```typescript
interface Playlist {
  id: number
  name: string
  description: string | null
  coverArtPath: string | null
  songCount: number
  totalDuration: number
  createdAt: number
  updatedAt: number
}
```

---

### 📁 `electron/parallelMetadataScanner.ts`

**Purpose**: Parallel processing for scanning music file metadata using multiple "workers".

**Class: `ParallelMetadataScanner`**

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `constructor(concurrency?)` | workers? | instance | Creates scanner with N workers (default: CPU cores - 1) |
| `setProgressCallback(callback)` | callback | `void` | Sets progress listener |
| `getPoolInfo()` | none | `{cpuCount, workerCount}` | Returns pool configuration |
| `discoverFiles(directoryPath)` | `string` | `Promise<FileInfo[]>` | Fast filesystem walk to find music files |
| `parseFileMetadata(...)` | path, name, ext, workerId | `Promise<MusicFile \| null>` | Parses one file's metadata |
| `scanAll(files)` | `FileInfo[]` | `Promise<MusicFile[]>` | Parallel metadata parsing |
| `scanDirectory(directoryPath)` | `string` | `Promise<MusicFile[]>` | Full scan: discover + parse |

| Helper Function | Returns | Description |
|-----------------|---------|-------------|
| `getParallelScanner()` | `ParallelMetadataScanner` | Gets singleton scanner instance |

---

### 📁 `electron/fingerprintWorkerPool.ts`

**Purpose**: Manages parallel fpcalc processes for batch audio fingerprinting.

**Class: `FingerprintWorkerPool`**

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `constructor(workerCount?)` | count? | instance | Creates pool with N worker slots |
| `setProgressCallback(callback)` | callback | `void` | Sets progress listener |
| `enqueue(filePath, index)` | path, index | `Promise<FingerprintJobResult>` | Adds file to processing queue |
| `processAll(filePaths)` | `string[]` | `Promise<FingerprintJobResult[]>` | Processes all files in parallel |
| `getStatus()` | none | status object | Returns queue length, active workers, etc. |
| `clearQueue()` | none | `void` | Clears pending jobs |

| Helper Function | Returns | Description |
|-----------------|---------|-------------|
| `getFingerprintPool(workerCount?)` | `FingerprintWorkerPool` | Gets singleton pool instance |
| `generateFingerprintsParallel(filePaths, onProgress?)` | `Promise<FingerprintJobResult[]>` | Main entry point for batch fingerprinting |
| `getCPUCount()` | `number` | Number of CPU cores |
| `getDefaultWorkerCount()` | `number` | CPU cores - 1 |

---

### 📁 `electron/ipc/handlers.ts`

**Purpose**: Central router that registers all IPC handlers.

| Function | Description |
|----------|-------------|
| `registerIpcHandlers()` | Calls all handler registration functions |

**Registered Modules**:
- `registerMusicHandlers()` - Folder scanning, file reading
- `registerApiHandlers()` - AcoustID, MusicBrainz, image download
- `registerYoutubeHandlers()` - YouTube download
- `registerSystemHandlers()` - Window controls, settings
- `registerCacheHandlers()` - Metadata cache operations
- `registerFingerprintHandlers()` - Audio fingerprinting
- `registerPlaylistHandlers()` - Playlist management

---

### 📁 `electron/ipc/modules/musicHandlers.ts`

**Purpose**: IPC handlers for music file operations.

| IPC Channel | Description |
|-------------|-------------|
| `music:scan-folder` | Scans folder for music files |
| `music:read-single-file` | Reads metadata for one file |
| `dialog:open-folder` | Opens folder picker for music library |
| `music:write-cover-art` | Writes album art to file using taglib-wasm |
| `music:read-file-buffer` | Reads file as Buffer for taglib-wasm |
| `music:write-file-buffer` | Writes Buffer back to disk |
| `metadata:scan-progress` | Sends real-time scan progress to renderer |

---

### 📁 `electron/ipc/modules/apiHandlers.ts`

**Purpose**: IPC handlers for external API calls.

| IPC Channel | Description |
|-------------|-------------|
| `api:lookup-fingerprint` | Queries AcoustID with fingerprint |
| `api:fetch-musicbrainz-release` | Gets release info from MusicBrainz |
| `api:fetch-cover-art` | Gets cover art URL from Cover Art Archive |
| `api:download-image` | Downloads image from URL to disk |

---

### 📁 `electron/ipc/modules/youtubeHandlers.ts`

**Purpose**: IPC handlers for YouTube downloading.

| IPC Channel | Description |
|-------------|-------------|
| `youtube:download` | Downloads audio from YouTube URL |
| `download:progress` | Sends download progress to renderer |
| `download:title` | Sends video title to renderer |
| `binary:download-progress` | Sends yt-dlp download progress |
| `binary:status` | Gets yt-dlp installation status |

---

### 📁 `electron/ipc/modules/systemHandlers.ts`

**Purpose**: IPC handlers for window controls and system info.

| IPC Channel | Description |
|-------------|-------------|
| `window:minimize` | Minimizes the window |
| `window:maximize` | Toggles maximize/restore |
| `window:close` | Closes the window |
| `settings:get` | Gets stored settings |
| `settings:save` | Saves settings |
| `dialog:open-download-folder` | Opens folder picker for downloads |
| `system:platform-info` | Returns OS and architecture |

---

### 📁 `electron/ipc/modules/cacheHandlers.ts`

**Purpose**: IPC handlers for metadata cache operations.

| IPC Channel | Description |
|-------------|-------------|
| `cache:get-file-status` | Gets scan status for a file |
| `cache:mark-scanned` | Records scan result |
| `cache:get-batch-status` | Batch status check |
| `cache:get-unscanned` | Filters to unscanned files |
| `cache:get-statistics` | Gets scan counts |

---

### 📁 `electron/ipc/modules/fingerprintHandlers.ts`

**Purpose**: IPC handlers for audio fingerprinting.

| IPC Channel | Description |
|-------------|-------------|
| `fpcalc:ensure` | Downloads fpcalc if needed |
| `fpcalc:generate` | Generates fingerprint for one file |
| `fpcalc:generate-batch` | Batch fingerprinting with progress |
| `fpcalc:pool-info` | Gets worker pool status |
| `fingerprint:progress` | Sends batch progress to renderer |

---

### 📁 `electron/ipc/modules/playlistHandlers.ts`

**Purpose**: IPC handlers for playlist management.

| IPC Channel | Description |
|-------------|-------------|
| `playlist:get-all` | Gets all playlists |
| `playlist:get-by-id` | Gets single playlist |
| `playlist:create` | Creates new playlist |
| `playlist:delete` | Deletes playlist |
| `playlist:rename` | Renames playlist |
| `playlist:add-songs` | Adds songs to playlist |
| `playlist:remove-song` | Removes song from playlist |
| `playlist:get-song-paths` | Gets ordered song paths |
| `playlist:reorder-songs` | Reorders songs (drag-drop) |
| `playlist:cleanup` | Removes missing songs |

---

## 🎨 React Components Reference

This section documents all React components in the `src/components/` folder with their props and internal functions.

---

### 📂 **Layout Components** (`src/components/layout/`)

---

#### 📁 `TitleBar/TitleBar.tsx`

**Purpose**: Custom frameless window title bar with window control buttons.

**Props**: None (stateless regarding props)

**Internal State**:
| State | Type | Description |
|-------|------|-------------|
| `isMaximized` | `boolean` | Tracks if window is maximized |

**Internal Functions**:
| Function | Description |
|----------|-------------|
| `handleMinimize()` | Calls `electronAPI.minimizeWindow()` |
| `handleMaximize()` | Calls `electronAPI.maximizeWindow()` to toggle |
| `handleClose()` | Calls `electronAPI.closeWindow()` |

**Features**:
- Displays app icon and title
- Minimize, Maximize/Restore, Close buttons
- Listens for window state changes to update the maximize button icon

---

#### 📁 `Sidebar/Sidebar.tsx`

**Purpose**: Navigation panel showing playlists, artists, and albums.

**Props**:
| Prop | Type | Description |
|------|------|-------------|
| `selectedView` | `string` | Current view (e.g., `"all"`, `"artist:Artist Name"`) |
| `onViewChange` | `(view: string) => void` | Callback when view changes |
| `musicFiles` | `MusicFileData[]` | All loaded music files (for extracting artists/albums) |
| `playlists` | `Playlist[]` | User playlists |
| `selectedPlaylistId` | `number \| null` | Currently selected playlist |
| `onPlaylistClick` | `(playlistId: number) => void` | Playlist selection callback |
| `onCreatePlaylist` | `() => void` | Opens create playlist modal |
| `onDeletePlaylist` | `(playlistId: number) => void` | Deletes a playlist |

**Internal Functions**:
| Function | Description |
|----------|-------------|
| `handlePlaylistClick(playlistId)` | Combines view change with playlist selection |

**Features**:
- **Playlists section**: All Songs + user playlists (collapsible)
- **Artists section**: Extracted from music files, searchable (collapsible)
- **Albums section**: With thumbnail art, searchable (collapsible)

---

#### 📁 `PlaybackBar/PlaybackBar.tsx`

**Purpose**: Fixed bottom bar with playback controls, seek bar, volume, and visualizer.

**Props**:
| Prop | Type | Description |
|------|------|-------------|
| `currentSong` | `MusicFile \| null` | Currently playing song |
| `isPlaying` | `boolean` | Playback state |
| `onPlayPause` | `() => void` | Toggle play/pause |
| `onNext` | `() => void` | Skip to next song |
| `onPrevious` | `() => void` | Go to previous song |
| `shuffle` | `boolean` | Shuffle enabled state |
| `repeatMode` | `'off' \| 'all' \| 'one'` | Repeat mode |
| `onToggleShuffle` | `() => void` | Toggle shuffle |
| `onCycleRepeatMode` | `() => void` | Cycle through repeat modes |
| `currentTime` | `number` | Current playback position (seconds) |
| `duration` | `number` | Total song duration (seconds) |
| `onSeek` | `(time: number) => void` | Seek to position |
| `volume` | `number` | Volume level (0-1) |
| `onVolumeChange` | `(volume: number) => void` | Change volume |
| `currentSound` | `Howl \| null` | Howler.js sound instance (for visualizer) |
| `visualizerMode` | `VisualizerMode` | Visualizer display mode |
| `playbackContextName?` | `string` | Name of current playlist context |

**Internal Functions**:
| Function | Description |
|----------|-------------|
| `formatTime(seconds)` | Converts seconds to `MM:SS` format |
| `handleSeekChange(value)` | Updates visual seek position during drag |
| `handleSeekAfterChange(value)` | Performs actual seek when drag ends |

**Features**:
- Album art display (with extracted colors for styling)
- Song title, artist, album display
- Playback context display ("Playing from: Playlist Name")
- Seek bar with time display
- Volume slider
- Shuffle, Repeat, Previous, Play/Pause, Next buttons
- Integrated audio visualizer

---

### 📂 **Common Components** (`src/components/common/`)

---

#### 📁 `AudioVisualizer/AudioVisualizer.tsx`

**Purpose**: Animated audio visualization using Web Audio API.

**Props**:
| Prop | Type | Description |
|------|------|-------------|
| `mode` | `VisualizerMode` | `'bars'`, `'wave'`, or `'off'` |
| `colors?` | `{ primary?: string, secondary?: string }` | Gradient colors |
| `howl?` | `Howl \| null` | Howler.js sound instance to analyze |

**VisualizerMode**: `'bars' | 'wave' | 'off'`

**Internal Functions**:
| Function | Description |
|----------|-------------|
| `connectToAudio()` | Creates Web Audio AnalyserNode from Howler |
| `ensureVisibleColor(color)` | Adjusts color for dark background visibility |
| `resizeCanvas()` | Handles responsive canvas sizing |
| `drawBars()` | Renders frequency bar visualization |
| `drawWave()` | Renders waveform visualization |
| `animate()` | Animation loop using requestAnimationFrame |

**Features**:
- Connects to Howler.js HTML5 audio
- Two visualization modes (bars/wave)
- Automatic color extraction from album art
- Glow effects and gradients

---

#### 📁 `ContextMenu/ContextMenu.tsx`

**Purpose**: Custom right-click context menu.

**Props**:
| Prop | Type | Description |
|------|------|-------------|
| `x` | `number` | X position (pixels) |
| `y` | `number` | Y position (pixels) |
| `items` | `ContextMenuItem[]` | Menu items to display |
| `onClose` | `() => void` | Close callback |

**ContextMenuItem Interface**:
```typescript
interface ContextMenuItem {
  label: string
  icon?: string        // Emoji or text
  onClick: () => void
  disabled?: boolean
  divider?: boolean    // Renders separator line
}
```

**Internal Functions**:
| Function | Description |
|----------|-------------|
| `handleClickOutside(e)` | Closes menu when clicking outside |
| `handleEscape(e)` | Closes menu on Escape key |

**Features**:
- Auto-repositions if would go off-screen
- Supports disabled items
- Supports divider lines

---

#### 📁 `NotificationToast/NotificationToast.tsx`

**Purpose**: Temporary notification popup.

**Props**:
| Prop | Type | Description |
|------|------|-------------|
| `message` | `string` | Toast message text |
| `type` | `'success' \| 'error' \| 'warning' \| 'info'` | Toast style |
| `isVisible` | `boolean` | Visibility state |
| `duration?` | `number` | Auto-hide duration (ms), default 3000 |
| `onClose?` | `() => void` | Close callback |

**Features**:
- Animated fade-in/fade-out
- Color-coded by type (green/red/yellow/blue)
- Auto-dismiss with configurable duration
- Optional close button

---

### 📂 **Download Components** (`src/components/download/`)

---

#### 📁 `DownloadButton/DownloadButton.tsx`

**Purpose**: YouTube download button with modal input.

**Props**:
| Prop | Type | Description |
|------|------|-------------|
| `onDownload` | `(url: string) => void` | Download callback |
| `isDownloading` | `boolean` | Download in progress |
| `progress?` | `number` | Download percentage |
| `binaryStatus?` | `string` | yt-dlp download status message |
| `binaryProgress?` | `number` | yt-dlp download percentage |

**Internal State**:
| State | Type | Description |
|-------|------|-------------|
| `isOpen` | `boolean` | Modal visibility |
| `url` | `string` | YouTube URL input |

**Internal Functions**:
| Function | Description |
|----------|-------------|
| `handleSubmit(e)` | Validates and submits URL |

**Features**:
- Expandable modal with URL input
- Shows yt-dlp binary download progress
- Rate limiting notice display

---

#### 📁 `DownloadNotification/DownloadNotification.tsx`

**Purpose**: Floating notification showing download progress.

**Props**:
| Prop | Type | Description |
|------|------|-------------|
| `title` | `string` | Video/song title |
| `progress` | `number` | Download percentage (0-100) |
| `isVisible` | `boolean` | Visibility state |
| `onClose?` | `() => void` | Close callback |

**Features**:
- Fixed position notification
- Progress bar with percentage
- Animated visibility transitions

---

### 📂 **Library Components** (`src/components/library/`)

---

#### 📁 `SongList/SongList.tsx`

**Purpose**: Main song list display with sorting, scanning, and context menu.

**Props**:
| Prop | Type | Description |
|------|------|-------------|
| `songs` | `MusicFile[]` | Array of songs to display |
| `onSongClick` | `(file, index) => void` | Song play callback |
| `playingIndex` | `number \| null` | Currently playing song index |
| `sortBy` | `SortOption` | Current sort option |
| `onSortChange` | `(sortBy: SortOption) => void` | Sort change callback |
| `onUpdateSingleFile` | `(filePath: string) => Promise<...>` | Refresh file metadata |
| `onShowNotification` | `(message, type) => void` | Show toast notification |
| `isPlaying?` | `boolean` | Playback state |
| `onPlayPause?` | `() => void` | Toggle playback |
| `playlists?` | `Playlist[]` | Available playlists (for context menu) |
| `onAddToPlaylist?` | `(playlistId, filePaths) => Promise<boolean>` | Add to playlist |
| `onCreatePlaylistWithSongs?` | `(filePaths) => void` | Create playlist with songs |

**SortOption**: `'title' | 'artist' | 'album' | 'dateAdded'`

**Internal Functions**:
| Function | Description |
|----------|-------------|
| `loadScanStatuses()` | Loads scan status for all songs |
| `handleGenerateFingerprint(e, file)` | Triggers song identification pipeline |

**Features**:
- Sortable columns (Title, Artist, Album, Date Added)
- Album art thumbnails
- Context menu option to "Identify Song" or "Retry Identification"
- Right-click context menu (Play, Add to Playlist, Scan, etc.)
- Highlights currently playing song

---

#### 📁 `BatchScanProgress/BatchScanProgress.tsx`

**Purpose**: Floating notification showing batch library scan progress.

**Props**:
| Prop | Type | Description |
|------|------|-------------|
| `isVisible` | `boolean` | Visibility state |
| `currentIndex` | `number` | Current song being processed |
| `totalCount` | `number` | Total songs to process |
| `currentSongName` | `string` | Name of current song |
| `apiPhase?` | `ApiPhase` | Current processing phase |
| `onCancel?` | `() => void` | Cancel callback |

**ApiPhase**: `'acoustid' | 'musicbrainz' | 'coverart' | 'writing' | null`

**Features**:
- Progress bar with count
- Shows current API phase with icon
- Cancel button
- Displays truncated song name

---

### 📂 **Playlist Components** (`src/components/playlists/`)

---

#### 📁 `PlaylistList.tsx`

**Purpose**: List of user playlists for the sidebar.

**Props**:
| Prop | Type | Description |
|------|------|-------------|
| `playlists` | `Playlist[]` | Array of playlists |
| `selectedPlaylistId` | `number \| null` | Currently selected playlist |
| `onPlaylistClick` | `(playlistId: number) => void` | Selection callback |
| `onCreateNew` | `() => void` | Opens create modal |
| `onDeletePlaylist?` | `(playlistId: number) => void` | Delete callback |

**Features**:
- Shows playlist cover art or default icon
- Displays song count
- Delete button with confirmation
- "Create Playlist" button at bottom

---

#### 📁 `CreatePlaylistModal.tsx`

**Purpose**: Modal dialog for creating new playlists.

**Props**:
| Prop | Type | Description |
|------|------|-------------|
| `isOpen` | `boolean` | Modal visibility |
| `onClose` | `() => void` | Close callback |
| `onCreate` | `(name, description?) => Promise<any>` | Create callback |

**Internal State**:
| State | Type | Description |
|-------|------|-------------|
| `name` | `string` | Playlist name input |
| `description` | `string` | Optional description |
| `isCreating` | `boolean` | Loading state |

**Internal Functions**:
| Function | Description |
|----------|-------------|
| `handleKeyDown(e)` | Handles Escape (close) and Enter (submit) |
| `handleCreate()` | Validates and creates playlist |

**Features**:
- Auto-focuses name input when opened
- Resets form when closed
- Keyboard shortcuts (Enter to create, Escape to close)
- Loading state during creation

---

### 📂 **Settings Components** (`src/components/settings/`)

---

#### 📁 `Settings/Settings.tsx`

**Purpose**: Full-page settings panel.

**Props**:
| Prop | Type | Description |
|------|------|-------------|
| `isOpen` | `boolean` | Panel visibility |
| `onClose` | `() => void` | Close callback |
| `onSettingsChange` | `() => void` | Settings saved callback |
| `onScanAll?` | `() => void` | Trigger batch library scan |
| `isBatchScanning?` | `boolean` | Scan in progress |
| `unscannedCount?` | `number` | Songs needing scan |
| `totalSongCount?` | `number` | Total library size |
| `visualizerMode` | `VisualizerMode` | Current visualizer mode |
| `onVisualizerModeChange` | `(mode: VisualizerMode) => void` | Change visualizer mode |

**Internal State**:
| State | Type | Description |
|-------|------|-------------|
| `settings` | `AppSettings` | Current app settings |
| `binaryStatuses` | `BinaryStatus[]` | External binary statuses |
| `platformInfo` | `PlatformInfo` | OS and architecture |

**Internal Functions**:
| Function | Description |
|----------|-------------|
| `loadSettings()` | Fetches settings from backend |
| `loadBinaryStatuses()` | Checks yt-dlp installation status |
| `loadPlatformInfo()` | Gets platform information |
| `handleSelectMusicFolder()` | Opens folder picker for music library |
| `handleSelectDownloadFolder()` | Opens folder picker for downloads |
| `handleSave()` | Saves settings to backend |

**Features**:
- Music folder selection with path display
- Download folder selection
- Binary status display (yt-dlp version, update status)
- Platform information
- Visualizer mode toggle (Bars/Wave/Off)
- Batch scan trigger with progress indicator
- Keyboard shortcut to close (Escape)

---

## 🪝 React Hooks Reference

This section documents all custom React hooks in the `src/hooks/` folder with their state, return values, and internal functions.

---

### 📁 `useAudioPlayer.ts`

**Purpose**: Manages audio playback using Howler.js with shuffle, repeat, and playback history.

**Usage**:
```typescript
const {
  currentSound, playingIndex, isPlaying, currentTime, duration, volume,
  playSong, togglePlayPause, playNext, playPrevious, seek, setVolume,
  shuffle, repeatMode, toggleShuffle, cycleRepeatMode
} = useAudioPlayer(musicFiles)
```

**Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `musicFiles` | `MusicFile[]` | Array of songs available for playback |

**Return Value** (`UseAudioPlayerReturn`):
| Property | Type | Description |
|----------|------|-------------|
| `currentSound` | `Howl \| null` | Current Howler.js sound instance |
| `playingIndex` | `number \| null` | Index of currently playing song |
| `isPlaying` | `boolean` | Whether audio is currently playing |
| `currentTime` | `number` | Current playback position (seconds) |
| `duration` | `number` | Total song duration (seconds) |
| `volume` | `number` | Volume level (0-1) |
| `shuffle` | `boolean` | Shuffle mode enabled |
| `repeatMode` | `RepeatMode` | `'off'`, `'all'`, or `'one'` |

**Returned Functions**:
| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `playSong(file, index)` | `MusicFile`, `number` | `void` | Starts playing a song at given index |
| `togglePlayPause()` | none | `void` | Toggles play/pause state |
| `playNext(auto?)` | `boolean` | `void` | Skips to next song (auto=true for end-of-song) |
| `playPrevious()` | none | `void` | Goes to previous song |
| `seek(time)` | `number` | `void` | Seeks to position in seconds |
| `setVolume(volume)` | `number` | `void` | Sets volume (0-1) |
| `toggleShuffle()` | none | `void` | Toggles shuffle on/off |
| `cycleRepeatMode()` | none | `void` | Cycles: off → all → one → off |

**Internal State**:
- `playHistory: number[]` - Tracks played song indices for Previous button
- `historyPosition: number` - Current position in history for navigation
- Uses `useRef` for tracking mounted state, avoiding stale closures

**Features**:
- Automatic next song on song end (respects repeat mode)
- Shuffle uses random selection excluding current song
- "Repeat One" replays the same song
- History tracking for Previous button (goes back through played songs)
- Volume persists across song changes
- Sends playback state to system tray

---

### 📁 `useMusicLibrary.ts`

**Purpose**: Manages loading, sorting, and updating the music file library.

**Usage**:
```typescript
const {
  musicFiles, sortedMusicFiles, loading, error, selectedFolder,
  sortBy, setSortBy, handleSelectFolder, scanFolder, updateSingleFile
} = useMusicLibrary()
```

**Return Value** (`UseMusicLibraryReturn`):
| Property | Type | Description |
|----------|------|-------------|
| `musicFiles` | `MusicFile[]` | Raw array of all loaded files |
| `sortedMusicFiles` | `MusicFile[]` | Sorted array based on current sort option |
| `loading` | `boolean` | Whether a scan is in progress |
| `error` | `string \| null` | Error message if scan failed |
| `selectedFolder` | `string \| null` | Currently selected music folder path |
| `sortBy` | `SortOption` | Current sort option |

**Returned Functions**:
| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `setSortBy(option)` | `SortOption` | `void` | Changes sort order |
| `handleSelectFolder()` | none | `Promise<void>` | Opens folder picker and scans |
| `scanFolder(path)` | `string` | `Promise<void>` | Scans a specific folder |
| `updateSingleFile(path)` | `string` | `Promise<MusicFile \| null>` | Refreshes one file's metadata in-place |

**SortOption**: `'title' | 'artist' | 'album' | 'dateAdded'`

**Features**:
- Auto-loads saved music folder on mount
- Sorted files are memoized for performance
- `updateSingleFile` updates metadata in-place without re-scanning (preserves scroll position)
- Uses `dateAdded` from file modification time for sorting

---

### 📁 `usePlaylists.ts`

**Purpose**: Manages playlist CRUD operations and maintains playlist state.

**Usage**:
```typescript
const {
  playlists, activePlaylist, loading,
  createPlaylist, deletePlaylist, renamePlaylist,
  addSongsToPlaylist, removeSongFromPlaylist,
  loadPlaylist, clearActivePlaylist, refreshPlaylists
} = usePlaylists({ onShowNotification, musicFiles })
```

**Options**:
| Option | Type | Description |
|--------|------|-------------|
| `onShowNotification?` | `(message, type) => void` | Optional notification callback |
| `musicFiles?` | `MusicFile[]` | All music files (for resolving paths to full objects) |

**Return Value** (`UsePlaylistsReturn`):
| Property | Type | Description |
|----------|------|-------------|
| `playlists` | `Playlist[]` | All playlists (metadata only) |
| `activePlaylist` | `PlaylistWithSongs \| null` | Currently loaded playlist with full song data |
| `loading` | `boolean` | Whether a playlist operation is in progress |

**Returned Functions**:
| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `createPlaylist(name, desc?)` | `string`, `string?` | `Promise<Playlist \| null>` | Creates a new playlist |
| `deletePlaylist(id)` | `number` | `Promise<boolean>` | Deletes a playlist |
| `renamePlaylist(id, name)` | `number`, `string` | `Promise<boolean>` | Renames a playlist |
| `addSongsToPlaylist(id, paths)` | `number`, `string[]` | `Promise<boolean>` | Adds songs to playlist |
| `removeSongFromPlaylist(id, path)` | `number`, `string` | `Promise<boolean>` | Removes a song |
| `loadPlaylist(id)` | `number` | `Promise<void>` | Loads playlist with full song data |
| `clearActivePlaylist()` | none | `void` | Clears active playlist state |
| `refreshPlaylists()` | none | `Promise<void>` | Reloads all playlists from database |

**Playlist Interface**:
```typescript
interface Playlist {
  id: number
  name: string
  description: string | null
  coverArtPath: string | null
  songCount: number
  totalDuration: number
  createdAt: number
  updatedAt: number
}
```

**PlaylistWithSongs Interface**:
```typescript
interface PlaylistWithSongs extends Playlist {
  songs: MusicFile[]  // Full song objects, not just paths
}
```

**Features**:
- Auto-loads all playlists on mount
- Optimistic local state updates (doesn't wait for backend)
- Shows success/error notifications for all operations
- Resolves file paths to full `MusicFile` objects when loading playlist
- Calculates total duration when loading playlist

---

### 📁 `useSongScanner.ts`

**Purpose**: Scans songs for metadata using audio fingerprinting, AcoustID, and MusicBrainz.

**Usage**:
```typescript
const {
  isScanning, batchProgress, scanSong, scanBatch, cancelBatchScan
} = useSongScanner({
  onShowNotification,
  onUpdateSingleFile,
  onStatusUpdate
})
```

**Options**:
| Option | Type | Description |
|--------|------|-------------|
| `onShowNotification?` | `(message, type) => void` | Shows toast notifications |
| `onUpdateSingleFile?` | `(path) => Promise<MusicFile \| null>` | Refreshes file in library |
| `onStatusUpdate?` | `(path, status) => void` | Updates scan status in UI |

**Return Value**:
| Property | Type | Description |
|----------|------|-------------|
| `isScanning` | `boolean` | Whether any scan is active |
| `batchProgress` | `BatchScanProgress` | Current batch scan progress |

**BatchScanProgress**:
```typescript
interface BatchScanProgress {
  isScanning: boolean
  currentIndex: number
  totalCount: number
  currentSongName: string
  apiPhase?: 'acoustid' | 'musicbrainz' | 'coverart' | 'writing' | null
}
```

**Returned Functions**:
| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `scanSong(file)` | `MusicFile` | `Promise<ScanResult>` | Scans a single song |
| `scanBatch(files)` | `MusicFile[]` | `Promise<void>` | Scans multiple songs with parallel fingerprinting |
| `cancelBatchScan()` | none | `void` | Cancels ongoing batch scan |

**ScanResult**:
```typescript
interface ScanResult {
  success: boolean
  status: 'unscanned' | 'scanned-tagged' | 'scanned-no-match' | 'file-changed'
  title?: string
  artist?: string
  error?: string
}
```

**Scan Pipeline (single song)**:
```
1. Generate fingerprint (local fpcalc binary)
   ↓
2. Query AcoustID API with fingerprint
   ↓ (rate limited: 3 calls/sec)
3. Query MusicBrainz API with recording MBID
   ↓ (rate limited: 1 call/sec)
4. Download cover art from Cover Art Archive
   ↓ (rate limited)
5. Write metadata to file using taglib-wasm
```

**Batch Scan (parallel fingerprinting)**:
```
Phase 1: PARALLEL FINGERPRINTING
┌─────────────────────────────────────────────────────────┐
│  Worker 1: song1.mp3 → fingerprint                      │
│  Worker 2: song2.mp3 → fingerprint                      │
│  Worker 3: song3.mp3 → fingerprint                      │
│  Worker 4: song4.mp3 → fingerprint                      │
│  ... (uses all CPU cores - 1)                           │
└─────────────────────────────────────────────────────────┘

Phase 2: SEQUENTIAL API LOOKUPS (rate-limited)
┌─────────────────────────────────────────────────────────┐
│  For each file with fingerprint:                        │
│    1. AcoustID lookup (wait for rate limit)             │
│    2. MusicBrainz lookup (wait for rate limit)          │
│    3. Cover art download (wait for rate limit)          │
│    4. Write metadata                                    │
│    5. Update UI                                         │
└─────────────────────────────────────────────────────────┘
```

**Features**:
- **Parallel fingerprinting**: Uses worker pool (CPU cores - 1) for blazing fast fingerprint generation
- **Rate limiting**: Respects API rate limits (AcoustID 3/sec, MusicBrainz 1/sec)
- **Phase display**: Shows current API phase (acoustid/musicbrainz/coverart/writing)
- **Cancellable**: Batch scan can be cancelled mid-process
- **Error recovery**: Continues to next file if one fails
- **Cache integration**: Marks files as scanned in SQLite cache to avoid re-scanning

---

## 🔌 Services Reference

This section documents all API service modules in the `src/services/` folder. These modules provide the core song identification functionality.

---

### 📁 `acoustid.ts`

**Purpose**: Queries the AcoustID API with audio fingerprints to identify songs.

**What is AcoustID?**
AcoustID is an open-source audio fingerprinting service. Given a fingerprint (generated by Chromaprint/fpcalc), it returns matching MusicBrainz Recording IDs.

**Exported Interface**:
```typescript
interface AcoustIDResultData {
  mbid: string       // MusicBrainz Recording ID
  title?: string     // Song title (if available)
  artist?: string    // Artist name (if available)
}
```

**Exported Functions**:
| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `lookupFingerprint(fingerprint, duration)` | `string`, `number` | `Promise<AcoustIDResultData \| null>` | Queries AcoustID API via IPC |

**Usage**:
```typescript
import { lookupFingerprint } from '../services/acoustid'

const result = await lookupFingerprint(fingerprint, duration)
if (result) {
  console.log(`Found: ${result.title} by ${result.artist}`)
  console.log(`MBID: ${result.mbid}`)
}
```

**Implementation Notes**:
- The actual API call is made in the backend (main process) via IPC
- This avoids CORS issues in the renderer
- API key is stored securely in the backend

---

### 📁 `fingerprint.ts`

**Purpose**: Generates audio fingerprints using the fpcalc binary (Chromaprint) via IPC.

**Why IPC?**
The fingerprinting runs in the Main Process using the fpcalc binary instead of WASM. This avoids memory exhaustion issues that occur when running fingerprinting in the Renderer process for large libraries.

**Exported Interface**:
```typescript
interface BatchFingerprintResult {
  filePath: string           // Path to the audio file
  success: boolean           // Whether fingerprinting succeeded
  fingerprint: string | null // The Chromaprint fingerprint
  duration: number | null    // Audio duration in seconds
  workerId: number           // Which worker processed this file
  processingTimeMs: number   // How long it took
}
```

**Exported Functions**:
| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `ensureFpcalcReady()` | none | `Promise<boolean>` | Ensures fpcalc binary is installed (downloads if needed) |
| `generateFingerprint(filePath)` | `string` | `Promise<string \| null>` | Generates fingerprint for a single file |
| `generateFingerprintsBatch(filePaths, onProgress?)` | `string[]`, callback? | `Promise<BatchFingerprintResult[]>` | Parallel fingerprinting for multiple files |
| `resetFingerprintErrors()` | none | `void` | Resets error counter (call at start of new scan) |

**Usage**:
```typescript
import { ensureFpcalcReady, generateFingerprint, generateFingerprintsBatch } from '../services/fingerprint'

// Single file
await ensureFpcalcReady()
const fingerprint = await generateFingerprint('/path/to/song.mp3')

// Batch (parallel)
const results = await generateFingerprintsBatch(
  ['/path/to/song1.mp3', '/path/to/song2.mp3'],
  (progress) => {
    console.log(`${progress.completed}/${progress.total} - Worker ${progress.workerId}`)
  }
)
```

**Circuit Breaker Pattern**:
- Tracks consecutive errors (max 5)
- After 5 consecutive failures, skips fingerprinting to avoid wasting resources
- Call `resetFingerprintErrors()` when starting a new scan session

---

### 📁 `musicbrainz.ts`

**Purpose**: Queries MusicBrainz API for detailed song metadata and cover art URLs.

**What is MusicBrainz?**
MusicBrainz is an open music encyclopedia with detailed metadata for millions of songs, albums, and artists.

**Exported Interfaces**:
```typescript
interface MusicBrainzArtist {
  id: string
  name: string
  'sort-name'?: string
}

interface MusicBrainzReleaseGroup {
  id: string
  title: string
  'primary-type'?: string       // "Album", "Single", "EP"
  'secondary-types'?: string[]  // ["Compilation"], ["Soundtrack"]
}

interface MusicBrainzRelease {
  id: string
  title: string
  date?: string                 // "2023-01-15" or "2023"
  country?: string              // "US", "GB", "JP"
  status?: string               // "Official", "Bootleg", "Promotion"
  'release-group'?: MusicBrainzReleaseGroup
}

interface MusicBrainzRecording {
  id: string
  title: string
  length?: number               // Duration in milliseconds
  'artist-credit'?: Array<{
    artist: MusicBrainzArtist
    name?: string               // Credit name (e.g., "feat. X")
    joinphrase?: string         // " & ", ", ", " feat. "
  }>
  releases?: MusicBrainzRelease[]
}
```

**Exported Functions**:
| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `lookupRecording(mbid)` | `string` | `Promise<MusicBrainzRecording \| null>` | Fetches recording metadata from MusicBrainz |
| `getCoverArtUrl(releaseMbid)` | `string` | `string` | Generates URL for 250px cover art |
| `getCoverArtUrls(releases, releaseGroupId?)` | `MusicBrainzRelease[]`, `string?` | `string[]` | Generates array of cover art URLs to try (with fallbacks) |
| `pickBestRelease(releases)` | `MusicBrainzRelease[]` | `MusicBrainzRelease \| null` | Picks the most likely "original" release |

**Usage**:
```typescript
import { lookupRecording, getCoverArtUrls, pickBestRelease } from '../services/musicbrainz'

// Get recording metadata
const recording = await lookupRecording('mbid-here')
if (recording) {
  // Get the best release (prefers original albums over compilations)
  const bestRelease = pickBestRelease(recording.releases)
  
  // Get cover art URLs to try
  const coverUrls = getCoverArtUrls(recording.releases, releaseGroupId)
  
  // Try downloading cover art (with fallbacks)
  for (const url of coverUrls) {
    const success = await tryDownload(url)
    if (success) break
  }
}
```

**Release Scoring Algorithm** (`pickBestRelease`):

The algorithm scores releases to find the most likely "original" release:

| Criterion | Score Impact |
|-----------|--------------|
| Official status | +100 |
| Promotion status | +20 |
| Album primary type | +50 |
| Single primary type | +40 |
| EP primary type | +30 |
| Compilation secondary type | **-200** |
| Soundtrack secondary type | **-150** |
| Remix secondary type | **-100** |
| Live secondary type | -50 |
| Earlier release date | +1 per year old (max +50) |

**Example**: A song appears on:
1. Original Album (2020, Official) → Score: 100 + 50 + 3 = **153**
2. Greatest Hits Compilation (2023, Official) → Score: 100 + 50 - 200 = **-50**
3. Movie Soundtrack (2021, Official) → Score: 100 + 50 - 150 + 2 = **2**

The algorithm correctly picks the **Original Album**.

**Cover Art URL Fallback Strategy**:

```
Priority 1: Try 250px for each release
  → /release/{id}/front-250

Priority 2: Try 500px for each release
  → /release/{id}/front-500

Priority 3: Try full size for each release
  → /release/{id}/front

Priority 4: Try release group (some only have art at group level)
  → /release-group/{id}/front-250
  → /release-group/{id}/front-500
  → /release-group/{id}/front
```

---

## 📋 TypeScript Types Reference

This section documents all TypeScript type definitions in the `src/types/` folder. These types provide type safety across the application.

---

### 📁 `electron.d.ts`

**Purpose**: Type definitions for the Electron IPC API exposed to the renderer process.

This file defines the `ElectronAPI` interface and all supporting types for communication between the React frontend and Electron backend.

---

#### **Core Types**

**`AppSettings`** - User preferences stored on disk:
```typescript
interface AppSettings {
  musicFolderPath: string | null   // Path to music library
  downloadFolderPath: string | null // Path for YouTube downloads
}
```

**`BinaryStatus`** - Status of external binaries (yt-dlp):
```typescript
interface BinaryStatus {
  name: string              // "yt-dlp"
  installed: boolean        // true if working
  version: string | null    // e.g., "2024.12.06"
  path: string | null       // Full path to binary
  latestVersion: string | null  // From GitHub
  needsUpdate: boolean      // true if outdated
}
```

**`PlatformInfo`** - Operating system information:
```typescript
interface PlatformInfo {
  platform: string  // "win32", "darwin", "linux"
  arch: string      // "x64", "arm64"
}
```

**`BinaryDownloadProgress`** - Progress when downloading binaries:
```typescript
interface BinaryDownloadProgress {
  status: 'checking' | 'not-found' | 'downloading' | 'downloaded' | 'installed' | 'updating' | 'version-check'
  message: string
  percentage?: number
}
```

---

#### **Audio Metadata Types**

**`AudioMetadata`** - Metadata to write to audio files:
```typescript
interface AudioMetadata {
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
```

---

#### **Scan Cache Types**

**`ScanStatusType`** - Status of a file's scan state:
```typescript
type ScanStatusType = 'unscanned' | 'scanned-tagged' | 'scanned-no-match' | 'file-changed'
```

| Status | Description |
|--------|-------------|
| `unscanned` | File has never been scanned |
| `scanned-tagged` | Scanned and metadata was written |
| `scanned-no-match` | Scanned but no match found |
| `file-changed` | File modified since last scan, needs rescan |

**`FileScanStatus`** - Full scan record from database:
```typescript
interface FileScanStatus {
  filePath: string      // Full path to file
  fileHash: string      // Hash of path+size+mtime for change detection
  scannedAt: number     // Timestamp of scan
  mbid: string | null   // MusicBrainz ID if matched
  hasMetadata: boolean  // Whether metadata was written
}
```

**`CacheScanStatistics`** - Scan summary counts:
```typescript
interface CacheScanStatistics {
  total: number          // Total files scanned
  withMetadata: number   // Files with metadata written
  withoutMetadata: number // Files with no match
}
```

---

#### **Playlist Types**

**`Playlist`** - Playlist metadata (without songs):
```typescript
interface Playlist {
  id: number
  name: string
  description: string | null
  coverArtPath: string | null
  songCount: number
  totalDuration: number    // Seconds
  createdAt: number        // Timestamp
  updatedAt: number        // Timestamp
}
```

**`PlaylistWithSongs`** - Playlist with full song data:
```typescript
interface PlaylistWithSongs extends Playlist {
  songs: MusicFile[]  // Full song objects, not just paths
}
```

---

#### **ElectronAPI Interface**

The main interface exposed to the renderer via `window.electronAPI`:

```typescript
interface ElectronAPI {
  // MUSIC LIBRARY
  scanMusicFolder(folderPath: string): Promise<MusicFile[]>
  selectMusicFolder(): Promise<string | null>
  readSingleFileMetadata(filePath: string): Promise<MusicFile | null>
  
  // SETTINGS
  getSettings(): Promise<AppSettings>
  saveSettings(settings: AppSettings): Promise<{ success: boolean; error?: string }>
  selectDownloadFolder(): Promise<string | null>
  getBinaryStatuses(): Promise<BinaryStatus[]>
  getPlatformInfo(): Promise<PlatformInfo>
  
  // WINDOW CONTROL
  minimizeWindow(): void
  maximizeWindow(): void
  closeWindow(): void
  onWindowStateChanged(callback: (maximized: boolean) => void): () => void
  
  // TRAY INTEGRATION
  onTrayPlayPause(callback: () => void): () => void
  sendPlaybackState(isPlaying: boolean): void
  sendWindowVisibility(visible: boolean): void
  
  // YOUTUBE DOWNLOAD
  downloadYouTube(url: string, outputPath: string): Promise<{
    success: boolean
    filePath?: string
    error?: string
    title?: string
  }>
  onDownloadProgress(callback: (progress) => void): () => void
  onBinaryDownloadProgress(callback: (progress) => void): () => void
  onDownloadTitle(callback: (title: string) => void): () => void
  
  // API LOOKUPS
  lookupAcoustid(fingerprint: string, duration: number): Promise<{
    mbid: string
    title?: string
    artist?: string
  } | null>
  lookupMusicBrainz(mbid: string): Promise<any>
  downloadImage(url: string, filePath: string): Promise<{ success: boolean; error?: string }>
  downloadImageWithFallback(urls: string[], filePath: string): Promise<{
    success: boolean
    url?: string
    error?: string
  }>
  
  // METADATA WRITING
  writeMetadata(filePath: string, metadata: AudioMetadata): Promise<{
    success: boolean
    error?: string
  }>
  writeCoverArt(filePath: string, imagePath: string): Promise<{
    success: boolean
    error?: string
  }>
  
  // FINGERPRINTING
  generateFingerprint(filePath: string): Promise<{
    success: boolean
    fingerprint?: string
    duration?: number
    error?: string
  }>
  fingerprintCheckReady(): Promise<{ ready: boolean; path: string | null }>
  fingerprintEnsureReady(): Promise<{
    success: boolean
    path?: string | null
    error?: string
  }>
  generateFingerprintsBatch(filePaths: string[]): Promise<{
    success: boolean
    results?: BatchFingerprintResult[]
    stats?: BatchStats
    error?: string
  }>
  fingerprintGetPoolInfo(): Promise<{ cpuCount: number; workerCount: number }>
  onFingerprintBatchProgress(callback: (progress) => void): () => void
  
  // CACHE OPERATIONS
  cacheGetFileStatus(filePath: string): Promise<ScanStatusType>
  cacheMarkFileScanned(filePath: string, mbid: string | null, hasMetadata: boolean): Promise<boolean>
  cacheGetBatchStatus(filePaths: string[]): Promise<Record<string, ScanStatusType>>
  cacheGetUnscannedFiles(filePaths: string[]): Promise<string[]>
  cacheGetStatistics(): Promise<CacheScanStatistics>
  cacheGetEntry(filePath: string): Promise<FileScanStatus | null>
  cacheCleanupOrphaned(): Promise<number>
  cacheClear(): Promise<boolean>
  
  // PLAYLIST OPERATIONS
  playlistCreate(name: string, description?: string): Promise<PlaylistResponse>
  playlistDelete(playlistId: number): Promise<PlaylistResponse>
  playlistRename(playlistId: number, newName: string): Promise<PlaylistResponse>
  playlistUpdateDescription(playlistId: number, description: string | null): Promise<PlaylistResponse>
  playlistUpdateCover(playlistId: number, coverArtPath: string | null): Promise<PlaylistResponse>
  playlistGetAll(): Promise<{ success: boolean; playlists: Playlist[]; error?: string }>
  playlistGetById(playlistId: number): Promise<{ success: boolean; playlist: Playlist | null }>
  playlistGetSongs(playlistId: number): Promise<{ success: boolean; songPaths: string[] }>
  playlistAddSongs(playlistId: number, filePaths: string[]): Promise<PlaylistResponse>
  playlistRemoveSong(playlistId: number, filePath: string): Promise<PlaylistResponse>
  playlistReorderSongs(playlistId: number, newOrder: ReorderItem[]): Promise<PlaylistResponse>
  playlistIsSongIn(playlistId: number, filePath: string): Promise<{ success: boolean; isIn: boolean }>
  playlistGetContainingSong(filePath: string): Promise<{ success: boolean; playlists: Playlist[] }>
  playlistCleanupMissing(): Promise<{ success: boolean; removedCount: number }>
}
```

**Global Declaration**:
```typescript
declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
```

This makes `window.electronAPI` available everywhere in the React app with full TypeScript support.

---

### 📁 `playlist.ts`

**Purpose**: Additional playlist type definitions and API response types.

**Core Types**:
```typescript
// Playlist metadata
interface Playlist {
  id: number
  name: string
  description: string | null
  coverArtPath: string | null
  songCount: number
  totalDuration: number
  createdAt: number
  updatedAt: number
}

// Playlist with songs loaded
interface PlaylistWithSongs extends Playlist {
  songs: MusicFile[]
}

// Song entry in playlist table
interface PlaylistSong {
  playlistId: number
  filePath: string
  position: number   // Order in playlist
  addedAt: number    // Timestamp
}
```

**API Response Types**:
| Type | Fields | Description |
|------|--------|-------------|
| `PlaylistCreateResponse` | `success`, `playlist?`, `error?` | Response when creating playlist |
| `PlaylistResponse` | `success`, `error?` | Generic success/error response |
| `PlaylistGetAllResponse` | `success`, `playlists`, `error?` | Response with all playlists |
| `PlaylistGetByIdResponse` | `success`, `playlist`, `error?` | Response with single playlist |
| `PlaylistGetSongsResponse` | `success`, `songPaths`, `error?` | Response with song paths |
| `PlaylistContainingSongResponse` | `success`, `playlists`, `error?` | Playlists containing a song |
| `PlaylistIsSongInResponse` | `success`, `isIn`, `error?` | Check if song is in playlist |
| `PlaylistCleanupResponse` | `success`, `removedCount`, `error?` | Cleanup missing songs |

---

### 📁 `vite-env.d.ts`

**Purpose**: Vite environment type declarations.

```typescript
/// <reference types="vite/client" />
```

This single line enables TypeScript support for:
- Vite-specific globals (`import.meta.env`)
- Static asset imports (`.svg`, `.png`, etc.)
- CSS module imports (`.module.css`)
- Hot Module Replacement (HMR) types

**Environment Variables** (via `import.meta.env`):
| Variable | Type | Description |
|----------|------|-------------|
| `import.meta.env.DEV` | `boolean` | True in development |
| `import.meta.env.PROD` | `boolean` | True in production |
| `import.meta.env.MODE` | `string` | `'development'` or `'production'` |
| `import.meta.env.VITE_*` | `string` | Custom env variables prefixed with `VITE_` |

---

## 🔧 Utility Functions Reference

This section documents all utility modules in the `src/utils/` folder. These provide reusable helper functions across the application.

---

### 📁 `colorExtractor.ts`

**Purpose**: Extracts dominant colors from album art for dynamic UI theming.

**Exported Interface**:
```typescript
interface ExtractedColors {
  primary: string    // Most dominant color
  secondary: string  // Second most dominant
  accent: string     // Third most dominant
  background: string // Fourth most dominant (for backgrounds)
}
```

**Exported Functions**:
| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `extractColorsFromImage(imageUrl)` | `string` | `Promise<ExtractedColors>` | Extracts 4 dominant colors from an image |

**Usage**:
```typescript
import { extractColorsFromImage } from '../utils/colorExtractor'

const colors = await extractColorsFromImage(albumArt)
// colors.primary → "#667eea"
// colors.secondary → "#764ba2"
// colors.accent → "#f093fb"
// colors.background → "#1a1a2e"

// Use for dynamic styling
element.style.background = `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`
```

**Algorithm**:
1. Load image onto a canvas (50x50 for performance)
2. Sample every 4th pixel
3. Skip transparent, very dark, and very light pixels
4. Quantize colors (reduce to nearest 32-step)
5. Count color occurrences
6. Return top 4 colors sorted by frequency

**Default Colors** (used when extraction fails):
```typescript
{
  primary: '#667eea',
  secondary: '#764ba2',
  accent: '#f093fb',
  background: '#1a1a2e'
}
```

---

### 📁 `pathResolver.ts`

**Purpose**: Converts file system paths to `file://` URLs in a cross-platform way.

**Exported Functions**:
| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `pathToFileURL(filePath)` | `string` | `string` | Converts a path to a file:// URL |

**Usage**:
```typescript
import { pathToFileURL } from '../utils/pathResolver'

// Windows
pathToFileURL('C:\\Users\\music\\song.mp3')
// → "file:///C:/Users/music/song.mp3"

// macOS/Linux  
pathToFileURL('/Users/music/song.mp3')
// → "file:///Users/music/song.mp3"
```

**Platform Handling**:
| Platform | Input | Output |
|----------|-------|--------|
| Windows | `C:\Users\song.mp3` | `file:///C:/Users/song.mp3` |
| macOS/Linux | `/Users/song.mp3` | `file:///Users/song.mp3` |
| Relative | `./song.mp3` | `file:///./song.mp3` |

**Why This Is Needed**:
- Howler.js and HTML5 Audio require `file://` URLs
- Windows paths use backslashes (`\`) which aren't valid in URLs
- Different path formats between Windows and Unix-like systems

---

### 📁 `rateLimiter.ts`

**Purpose**: Provides delays between API calls to respect rate limits.

**Rate Limits**:
| API | Official Limit | Our Delay |
|-----|----------------|-----------|
| AcoustID | 3 requests/sec | 500ms (2/sec) |
| MusicBrainz | 1 request/sec | 1100ms |
| Cover Art Archive | 1 request/sec | 1100ms |
| Between Songs | N/A | 500ms buffer |

**Exported Constants**:
```typescript
const API_DELAYS = {
  ACOUSTID: 500,        // ms
  MUSICBRAINZ: 1100,    // ms
  COVERART: 1100,       // ms
  BETWEEN_SONGS: 500,   // ms
} as const
```

**Exported Functions**:
| Function | Returns | Description |
|----------|---------|-------------|
| `delay(ms)` | `Promise<void>` | Simple delay function |
| `waitForAcoustID()` | `Promise<void>` | Waits 500ms for AcoustID |
| `waitForMusicBrainz()` | `Promise<void>` | Waits 1100ms for MusicBrainz |
| `waitForCoverArt()` | `Promise<void>` | Waits 1100ms for Cover Art |
| `waitBetweenSongs()` | `Promise<void>` | Waits 500ms between songs |

**Usage**:
```typescript
import { waitForAcoustID, waitForMusicBrainz, waitForCoverArt } from '../utils/rateLimiter'

// In scan pipeline:
await waitForAcoustID()
const acoustidResult = await lookupFingerprint(fingerprint, duration)

await waitForMusicBrainz()
const mbData = await lookupRecording(mbid)

await waitForCoverArt()
const coverArt = await downloadImage(url)
```

**Why Conservative Delays?**
- APIs may block/ban for exceeding limits
- Error responses (429 Too Many Requests) waste time
- Small buffer prevents issues from timing variations

---

### 📁 `sortMusicFiles.ts`

**Purpose**: Sorts music file arrays by various criteria.

**Exported Type**:
```typescript
type SortOption = 'title' | 'artist' | 'track' | 'dateAdded'
```

**Exported Functions**:
| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `sortMusicFiles(files, sortBy)` | `MusicFile[]`, `SortOption` | `MusicFile[]` | Returns sorted copy of files |

**Usage**:
```typescript
import { sortMusicFiles, type SortOption } from '../utils/sortMusicFiles'

const [sortBy, setSortBy] = useState<SortOption>('title')

const sortedFiles = sortMusicFiles(musicFiles, sortBy)
```

**Sort Behaviors**:

| Sort Option | Primary Sort | Secondary Sort | Order |
|-------------|--------------|----------------|-------|
| `title` | Song title | — | A-Z |
| `artist` | Artist name | Title | A-Z, A-Z |
| `track` | Album name | Track number | A-Z, 1-99 |
| `dateAdded` | Date added | — | Newest first |

**Sort Details**:

**`title`**: Sorts by song title (or filename if no title)
```
"Another One Bites the Dust"
"Bohemian Rhapsody"  
"Crazy Little Thing Called Love"
```

**`artist`**: Sorts by artist, then by title within same artist
```
ABBA - "Dancing Queen"
ABBA - "Mamma Mia"
Queen - "Bohemian Rhapsody"
Queen - "We Will Rock You"
```

**`track`**: Sorts by album, then by track number (perfect for playing albums in order)
```
A Night at the Opera - Track 1
A Night at the Opera - Track 2
News of the World - Track 1
News of the World - Track 2
```

**`dateAdded`**: Newest files first (descending order)
```
song_added_today.mp3
song_added_yesterday.mp3
song_added_last_week.mp3
```

**Note**: The function creates a copy of the array to avoid mutating the original.

---

## 🏠 Core Application Files Reference

This section documents the root-level files in the `src/` folder that form the application's entry point and main component.

---

### 📁 `main.tsx`

**Purpose**: React application entry point.

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

**What It Does**:
1. Imports the root `App` component
2. Imports global styles (`index.css`)
3. Creates a React root attached to `#root` element
4. Renders the app wrapped in `StrictMode` for development checks

**StrictMode Benefits**:
- Highlights potential problems
- Detects legacy lifecycle methods
- Double-invokes effects (dev only) to catch side-effect bugs

---

### 📁 `App.tsx`

**Purpose**: Main application component that orchestrates all features.

**Hooks Used**:
```typescript
// Custom hooks
const { sortedMusicFiles, loading, error, ... } = useMusicLibrary()
const { playlists, activePlaylist, createPlaylist, ... } = usePlaylists(options)
const { batchProgress, scanBatch, cancelBatchScan } = useSongScanner(options)
const { playingIndex, playSong, togglePlayPause, ... } = useAudioPlayer(songs)
```

---

#### **State Management**

| State | Type | Purpose |
|-------|------|---------|
| `selectedView` | `string` | Current view (`'all'`, `'artist:Name'`, `'album:Name'`, `'playlist:1'`) |
| `searchTerm` | `string` | Search filter |
| `scanStatuses` | `Record<string, ScanStatusType>` | Scan status for each file |
| `visualizerMode` | `VisualizerMode` | `'bars'`, `'wave'`, or `'off'` |
| `playbackContext` | `object` | Current playback source (separate from view) |
| `isDownloading` | `boolean` | YouTube download in progress |
| `downloadProgress` | `number` | Download percentage |
| `showSettings` | `boolean` | Settings panel visibility |
| `toastMessage` | `string` | Current notification message |
| `selectedPlaylistId` | `number \| null` | Currently selected playlist |

---

#### **Core Functions**

| Function | Description |
|----------|-------------|
| `showToastNotification(message, type)` | Displays a toast notification |
| `handleStatusUpdate(filePath, status)` | Updates scan status for a file |
| `loadScanStatuses()` | Loads scan statuses for all files from cache |
| `loadSettings()` | Loads download folder from settings |
| `handleKeyDown(e)` | Handles global keyboard shortcuts |
| `handleSettingsChange()` | Reloads settings after changes |
| `handleDownload(url)` | Downloads audio from YouTube URL |
| `playSong(file, index)` | Plays a song and sets playback context |

---

#### **Playback Context System**

The app uses a **playback context** to keep playback and navigation separate:

```typescript
const [playbackContext, setPlaybackContext] = useState<{
  type: 'all' | 'playlist' | 'artist' | 'album'
  name: string
  songs: MusicFile[]
}>({ type: 'all', name: 'All Songs', songs: sortedMusicFiles })
```

**Why?**
- User can browse "All Songs" while a playlist is playing
- Next/Previous stays within the original context
- Display shows "Playing from: Playlist Name"

**Context Flow**:
```
User clicks song in playlist
    ↓
playSong() sets playbackContext to playlist
    ↓
useAudioPlayer uses playbackContext.songs
    ↓
Next/Previous stays in playlist
    ↓
User can navigate to "All Songs" view
    (but playback continues in playlist)
```

---

#### **View Filtering**

The `filteredMusicFiles` is computed based on `selectedView`:

```typescript
const filteredMusicFiles = useMemo(() => {
  let base = sortedMusicFiles

  if (selectedView.startsWith('artist:')) {
    base = base.filter(f => f.metadata?.artist === artist)
  } else if (selectedView.startsWith('album:')) {
    base = base.filter(f => f.metadata?.album === album)
  } else if (selectedView.startsWith('playlist:') && activePlaylist) {
    base = activePlaylist.songs
  }

  // Apply search filter
  if (searchTerm) {
    base = base.filter(f => /* matches title, artist, or album */)
  }

  return base
}, [sortedMusicFiles, selectedView, searchTerm, activePlaylist])
```

---

#### **Keyboard Shortcuts**

| Key | Action |
|-----|--------|
| `Space` | Play/Pause (when not typing) |
| `ArrowRight` | Next song |
| `ArrowLeft` | Previous song |
| `ArrowUp` | Volume up (+10%) |
| `ArrowDown` | Volume down (-10%) |
| `M` | Toggle mute |
| `S` | Toggle shuffle |
| `R` | Cycle repeat mode |
| `Escape` | Close settings |

---

#### **Component Structure**

```jsx
<App>
  <TitleBar />
  
  <div className="main-content">
    <Sidebar
      selectedView={selectedView}
      onViewChange={setSelectedView}
      musicFiles={sortedMusicFiles}
      playlists={playlists}
      ...
    />
    
    <main className="content-area">
      <header>
        <DownloadButton onDownload={handleDownload} ... />
        <input type="search" />
        <button onClick={() => setShowSettings(true)}>⚙️</button>
      </header>
      
      <SongList
        songs={filteredMusicFiles}
        onSongClick={playSong}
        playingIndex={playingIndex}
        ...
      />
    </main>
  </div>
  
  <PlaybackBar
    currentSong={currentSong}
    isPlaying={isPlaying}
    onPlayPause={togglePlayPause}
    ...
  />
  
  <Settings isOpen={showSettings} ... />
  <CreatePlaylistModal isOpen={showCreatePlaylistModal} ... />
  <BatchScanProgress isVisible={batchProgress.isScanning} ... />
  <NotificationToast message={toastMessage} ... />
  <DownloadNotification title={downloadTitle} ... />
</App>
```

---

### 📁 `index.css`

**Purpose**: Global styles and CSS reset.

**Contents**:
- CSS reset (box-sizing, margins)
- Root element styling
- Font stack definition
- Scrollbar styling
- Selection colors
- OverlayScrollbars customization

**Key Styles**:
```css
:root {
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  background-color: #1a1a1a;
  color: #ffffff;
}

#root {
  height: 100vh;
  display: flex;
  flex-direction: column;
}
```

---

### 📁 `App.css`

**Purpose**: Main component styles for the entire application.

**Sections** (organized by component):
| Section | Purpose |
|---------|---------|
| Layout | App container, sidebar, content area |
| TitleBar | Window controls |
| Sidebar | Navigation, artists, albums lists |
| SongList | Song rows, sorting headers |
| PlaybackBar | Player controls, seek bar, visualizer |
| Settings | Settings panel |
| Modals | Create playlist, context menus |
| Notifications | Toast messages, download progress |
| Scrollbars | Custom scrollbar styling |

**Key CSS Variables/Colors**:
- Background: `#1a1a1a` (dark)
- Sidebar: `#1e1e24`
- Accent: `#667eea` (purple-blue gradient)
- Hover states: `rgba(255, 255, 255, 0.05)`

**Responsive Design**:
- Fixed sidebar width (240px)
- Flexible content area
- Fixed playback bar (80px)
- Custom scrollbars with `overlay-scrollbars`

---

