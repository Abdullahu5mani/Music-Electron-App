# System Documentation

## 1. System Overview

### High-Level Architecture
The application follows the **Electron** architecture pattern, which divides the application into two main types of processes:
1.  **Main Process (Node.js)**: Acts as the backend entry point. It manages application lifecycle, creates windows, interacts with the operating system (filesystem, native menus, system tray), and handles heavy computations or sensitive operations (database access, downloading).
2.  **Renderer Process (React + Vite)**: Acts as the frontend. It renders the UI, manages user state, and plays audio. It runs in a sandboxed Chromium environment and communicates with the Main Process via a secure **Inter-Process Communication (IPC)** bridge.

The application uses a **Modular Monolith** structure within the Main Process, where distinct features (Music Scanning, YouTube Downloading, API interactions) are separated into modules but run within the same Node.js process.

### Architecture Diagram

```ascii
+-----------------------------------------------------------------------+
|                          ELECTRON CONTAINER                           |
|                                                                       |
|  +---------------------+                  +------------------------+  |
|  |    MAIN PROCESS     |    IPC Bridge    |    RENDERER PROCESS    |  |
|  |     (Node.js)       |<================>|     (React + Vite)     |  |
|  |                     |  (JSON serialized|                        |  |
|  +----------+----------+      messages)   +-----------+------------+  |
|             |                                         |               |
|             v                                         v               |
|  +---------------------+                  +------------------------+  |
|  |   Core Modules      |                  |     React Contexts     |  |
|  | - Window Manager    |                  | - AudioPlayer Hook     |  |
|  | - Tray Manager      |                  | - MusicLibrary Hook    |  |
|  | - IPC Handlers      |                  | - SongScanner Hook     |  |
|  +----------+----------+                  +------------------------+  |
|             |                                                         |
|             |                                                         |
|  +----------v----------+                  +------------------------+  |
|  |  Feature Modules    |                  |      UI Components     |  |
|  | - MusicScanner      |                  | - SongList             |  |
|  | - YoutubeDownloader |                  | - PlaybackBar          |  |
|  | - MetadataCache     |                  | - Sidebar              |  |
|  +----------+----------+                  +------------------------+  |
|             |                                                         |
+-------------|---------------------------------------------------------+
              |
              v
       +-------------+
       | File System |  (Read Music / Write DB / Save Downloads)
       +-------------+
```

---

## 2. Infrastructure & Setup

### Tech Stack
*   **Runtime**: Electron 39
*   **Frontend**: React 18, TypeScript, Vite 7
*   **Styling**: CSS (Custom, no framework), `overlayscrollbars`
*   **State Management**: React Hooks (`useReducer`, `useState`, `useContext`)
*   **Database**: `better-sqlite3` (SQLite)
*   **Audio Engine**: `howler.js` (Playback), `wavesurfer.js` (Visualization - *implied*)
*   **Audio Analysis**: `@unimusic/chromaprint` (WASM fingerprinting), `music-metadata`
*   **Networking**: `axios` (API requests), `yt-dlp-wrap` (YouTube downloads)

### Infrastructure Map
The infrastructure is primarily local, with dependencies on external public APIs.

```ascii
                            +-------------------+
                            |  External Services|
                            |                   |
        +------------------>|  YouTube (Video)  |
        |                   |                   |
        |  +--------------->|  AcoustID (FP)    |
        |  |                |                   |
        |  |  +------------>|  MusicBrainz (DB) |
        |  |  |             |                   |
        |  |  |  +--------->|  CoverArt Archive |
        |  |  |  |          +-------------------+
        |  |  |  |
+-------|--|--|--|--------------------------------------------------+
|       |  |  |  |             LOCAL MACHINE                        |
|       |  |  |  |                                                  |
|  +----+--+--+--+----+       +------------------+                  |
|  |    Music App     |       |   Local Files    |                  |
|  | (Electron/Node)  |<----->| - User Music     |                  |
|  |                  |       | - Config JSON    |                  |
|  +--------+---------+       | - Assets (Covers)|                  |
|           |                 +------------------+                  |
|           |                                                       |
|           v                                                       |
|  +------------------+                                             |
|  |  SQLite Database |                                             |
|  | (metadata-cache) |                                             |
|  +------------------+                                             |
+-------------------------------------------------------------------+
```

### Configuration
Configuration is handled via two main mechanisms:
1.  **Environment Variables**: Managed via `.env` files (mostly for build-time secrets or API keys, though none are strictly required for the core offline features).
2.  **Runtime Configuration (`config.json`)**: User preferences (music directory path, download path, theme settings) are stored in a JSON file in the OS-specific `AppData` folder.
3.  **Metadata Database (`metadata_cache.db`)**: A SQLite database stores the state of the library (scanned files, fingerprints, cached metadata) to avoid re-processing files on every startup.

---

## 3. Inter-Process Communication (IPC) & Data Flow

### Communication Analysis
*   **IPC (Main <-> Renderer)**: The primary communication channel.
    *   **Invoke/Handle**: Used for bidirectional request-response flows (e.g., "Scan this folder" -> returns list of files). This is `async/await` based.
    *   **Send/On**: Used for one-way events (e.g., "Download Progress Updated" -> Renderer updates UI).
*   **API Calls**: The Main Process (via `axios`) makes HTTP requests to AcoustID, MusicBrainz, and Cover Art Archive. The Renderer does *not* make direct external API calls for metadata to keep logic centralized and secure.
*   **WASM**: The Renderer runs the `chromaprint` WASM module for audio fingerprinting to offload CPU work from the Main thread (though it blocks the UI thread if not managed carefully).

### IPC Sequence Diagram (Complex Flow: Audio Fingerprinting & Tagging)

```ascii
User (UI)        Renderer (React)        Main Process (Node)      External API (Web)      Database (SQLite)
   |                    |                        |                        |                       |
   | Click "Identify"   |                        |                        |                       |
   |------------------->|                        |                        |                       |
   |                    | 1. Read File Buffer    |                        |                       |
   |                    |----------------------->|                        |                       |
   |                    |                        | 2. fs.readFile()       |                       |
   |                    |                        |----------------------->|                       |
   |                    |<-----------------------|                        |                       |
   |                    |    (Uint8Array)        |                        |                       |
   |                    |                        |                        |                       |
   |                    | 3. Calc Fingerprint    |                        |                       |
   |                    |    (WASM Module)       |                        |                       |
   |                    |                        |                        |                       |
   |                    | 4. Lookup AcoustID     |                        |                       |
   |                    |----------------------->|                        |                       |
   |                    |                        | 5. POST api.acoustid.org                       |
   |                    |                        |----------------------->|                       |
   |                    |                        |<-----------------------|                       |
   |                    |<-----------------------|      (MBID)            |                       |
   |                    |                        |                        |                       |
   |                    | 6. Lookup Metadata     |                        |                       |
   |                    |----------------------->|                        |                       |
   |                    |                        | 7. GET musicbrainz.org |                       |
   |                    |                        |----------------------->|                       |
   |                    |                        |<-----------------------|                       |
   |                    |<-----------------------|    (Title, Artist)     |                       |
   |                    |                        |                        |                       |
   |                    | 8. Write Tags          |                        |                       |
   |                    |----------------------->|                        |                       |
   |                    |                        | 9. taglib.write()      |                       |
   |                    |                        | 10. Cache Result       |                       |
   |                    |                        |----------------------------------------------->|
   |                    |<-----------------------|                        |                       |
   |       Update UI    |                        |                        |                       |
   |<-------------------|                        |                        |                       |
```

---

## 4. Core Code Flows

### 1. Library Scanning
*   **Entry**: User selects a folder via `Settings`.
*   **Main**: `musicScanner.ts` recursively walks the directory structure.
*   **Filter**: Checks file extensions against supported types (.mp3, .flac, etc.).
*   **Parse**: Uses `music-metadata` to extract ID3 tags and cover art.
*   **Cache**: Checks `metadata_cache.db` to see if the file has changed (hash of path + size + mtime).
*   **Return**: Sends a list of `MusicFile` objects to the Renderer.
*   **Renderer**: Updates the `MusicLibraryContext` and renders the list.

### 2. Audio Playback
*   **Entry**: User clicks a song in `SongList`.
*   **Renderer**: `useAudioPlayer` hook receives the file path.
*   **Resolution**: `pathResolver.ts` converts the OS path to a `file://` URL.
*   **Engine**: `howler.js` loads the audio resource.
*   **Sync**: A `timeupdate` event loop updates the UI slider.
*   **Tray**: Renderer sends `playback-state-changed` IPC to Main to update the System Tray (Play/Pause/Title).

### 3. YouTube Download
*   **Entry**: User pastes a URL and clicks "Download".
*   **Main**: `youtubeDownloader.ts` checks for the `yt-dlp` binary.
    *   If missing, it downloads the correct binary for the OS/Arch from GitHub.
*   **Process**: Spawns `yt-dlp` process with arguments to extract audio, convert to MP3, and embed metadata.
*   **Events**: Emits `download-progress` events to Renderer via IPC.
*   **Completion**: Saves the file to the configured "Downloads" folder and notifies Renderer to refresh the library.

---

## 5. File-by-File Deep Dive

### Directory: `electron/` (Main Process)

#### `main.ts`
*   **Purpose**: Entry point for the Electron app.
*   **Key Functions**: `app.whenReady()`, `registerIpcHandlers()`.
*   **Dependencies**: `window.ts`, `tray.ts`, `ipc/handlers.ts`.

#### `window.ts`
*   **Purpose**: Configures and creates the browser window.
*   **Key Functions**: `createWindow()` (sets dimensions, frameless style, preload script).
*   **Dependencies**: `electron`, `path`.

#### `musicScanner.ts`
*   **Purpose**: Handles file system operations for finding and reading music files.
*   **Key Functions**: `scanMusicFiles(dir)`, `readSingleFileMetadata(path)`.
*   **Dependencies**: `music-metadata`, `fs`, `path`.

#### `metadataCache.ts`
*   **Purpose**: Manages the SQLite database for caching file states.
*   **Key Functions**: `initializeDatabase()`, `markFileScanned()`, `getBatchScanStatus()`.
*   **Dependencies**: `better-sqlite3`, `crypto`.

#### `youtubeDownloader.ts`
*   **Purpose**: Wrapper around `yt-dlp` for downloading content.
*   **Key Functions**: `downloadYouTubeAudio(url)`, `ensureYtDlpBinary()`.
*   **Dependencies**: `yt-dlp-wrap`, `binaryManager.ts`.

#### `binaryManager.ts`
*   **Purpose**: Manages external binaries (yt-dlp, ffmpeg), ensuring they exist and are executable.
*   **Key Functions**: `getYtDlpBinaryPath()`, `checkBinaryStatus()`.
*   **Dependencies**: `fs`, `os`.

### Directory: `electron/ipc/`

#### `handlers.ts`
*   **Purpose**: Aggregates all IPC module registrations.
*   **Key Functions**: `registerIpcHandlers()`.
*   **Dependencies**: `modules/*.ts`.

#### `modules/musicHandlers.ts`
*   **Purpose**: IPC endpoints for scanning and tagging.
*   **Key Functions**: `handle('scan-music-folder')`, `handle('write-metadata')`.
*   **Dependencies**: `musicScanner.ts`.

#### `modules/apiHandlers.ts`
*   **Purpose**: IPC endpoints for external API calls (AcoustID, MusicBrainz).
*   **Key Functions**: `handle('lookup-acoustid')`, `handle('download-image')`.
*   **Dependencies**: `axios`.

### Directory: `src/` (Renderer Process)

#### `App.tsx`
*   **Purpose**: Root React component, manages global state and layout.
*   **Key Functions**: `useEffect` (bootstrapping), `Render`.
*   **Dependencies**: `components/*`, `hooks/*`.

#### `hooks/useAudioPlayer.ts`
*   **Purpose**: Encapsulates audio playback logic.
*   **Key Functions**: `playSong()`, `pause()`, `seek()`.
*   **Dependencies**: `howler`.

#### `hooks/useMusicLibrary.ts`
*   **Purpose**: Manages the list of songs and sort order.
*   **Key Functions**: `scanFolder()`, `sortMusicFiles()`.
*   **Dependencies**: `electronAPI`.

#### `utils/fingerprintGenerator.ts`
*   **Purpose**: Generates audio fingerprints using WASM.
*   **Key Functions**: `generateFingerprint()`.
*   **Dependencies**: `@unimusic/chromaprint` (WASM).

---

## 6. Conclusion

### Architectural Analysis
The application demonstrates a solid separation of concerns by offloading heavy I/O (scanning, database) to the Main process while keeping the UI responsive. The use of a "Modular Monolith" in the backend allows for easy maintenance.

### Bottlenecks
1.  **WASM Fingerprinting in Renderer**: Running `chromaprint` in the Renderer process (even with `async`) can cause UI stutters during batch processing of large libraries.
2.  **Large Library Performance**: While virtualized lists (`SongList`) help rendering, holding thousands of song objects in React state might impact memory usage.

### Areas for Improvement
1.  **Worker Threads**: Move audio fingerprinting to a Web Worker or a Node.js Worker Thread in the Main process to unblock the UI completely.
2.  **Database Query Optimization**: Currently, some metadata reads might be redundant. Optimizing the `metadataCache` lookups could speed up large scans.
3.  **Download Queue**: Implementing a proper job queue for downloads would allow for better error handling and multiple concurrent downloads (currently limited to sequential).
