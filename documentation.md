# 1. System Overview
 
## High-Level Architecture
 
The application follows a standard **Electron** architecture, utilizing a multi-process model to separate the application logic (backend) from the user interface (frontend).
 
*   **Frontend (Renderer Process):** Built with **React** and **Vite**, this layer handles the UI, state management, and user interactions. It communicates with the backend exclusively via a secure **Context Bridge** API.
*   **Backend (Main Process):** Built with **Node.js** and **TypeScript**, this layer manages system-level operations such as file system access, database interactions (`better-sqlite3`), binary management (`yt-dlp`), and native window control.
*   **Modular IPC Handlers:** The backend splits IPC logic into distinct modules (`musicHandlers`, `apiHandlers`, `youtubeHandlers`, `systemHandlers`, `cacheHandlers`) to maintain separation of concerns.
*   **Data Persistence:** A persistent **SQLite** database stores file metadata, scan statuses, and hashes to prevent redundant scanning. Application settings are stored in a standard JSON format.
 
## Architecture Diagram
 
```ascii
+-----------------------+              +--------------------------+
|   RENDERER (React)    |              |     MAIN (Electron)      |
|                       |              |                          |
+-[UI Layer]------------+              +-[System Layer]-----------+
| App.tsx               |   IPC (JSON) | main.ts                  |
|  |                    | <----------> |  |                       |
|  +-> SongList         |              |  +-> ipcController       |
|  |   |                |              |      |                   |
|  |   +-> VirtualList  |              |      +-> musicHandlers   |
|  |                    |              |      +-> apiHandlers     |
|  +-> PlaybackBar      |              |      +-> systemHandlers  |
|      |                |              |                          |
+-[Logic Layer]---------+              +-[Data Layer]-------------+
| useMusicLibrary.ts    |              | metadataCache.ts (SQLite)|
| useSongScanner.ts     |              | binaryManager.ts (fs)    |
| useAudioPlayer.ts     |              | youtubeDownloader.ts     |
+-----------------------+              +--------------------------+
```
 
# 2. Database & Data Structures
 
## SQLite Schema (`metadata_cache.db`)
 
The `metadataCache.ts` module manages a single SQLite table required for tracking file states.
 
```sql
CREATE TABLE IF NOT EXISTS metadata_cache (
  filePath TEXT PRIMARY KEY,       -- Absolute path to audio file
  fileHash TEXT NOT NULL,          -- SHA-256(path + size + mtime)
  scannedAt INTEGER NOT NULL,      -- Unix timestamp
  mbid TEXT,                       -- MusicBrainz Recording ID
  hasMetadata INTEGER DEFAULT 0    -- Boolean (0 or 1)
);
 
CREATE INDEX IF NOT EXISTS idx_file_hash ON metadata_cache(fileHash);
```
 
## Core Data Interfaces
 
**`MusicFile` (Shared Interface):**
```typescript
interface MusicFile {
  path: string;       // "C:/Music/Song.mp3"
  name: string;       // "Song.mp3"
  size: number;       // Bytes
  metadata?: {
    title?: string;
    artist?: string;
    album?: string;
    albumArt?: string; // Base64 data URI
    duration?: number;
  };
}
```
 
# 3. Inter-Process Communication (IPC)
 
## Secure Context Bridge (`preload.ts`)
The `electronAPI` object is exposed to the `window` global.
 
| Method | Type | Description |
| :--- | :--- | :--- |
| `scanMusicFolder(path)` | Invoke | Recursively scans a directory. |
| `readSingleFileMetadata(path)` | Invoke | Reads ID3/Vorbis tags from a single file. |
| `cacheGetBatchStatus(paths)` | Invoke | Returns map of scan statuses from SQLite. |
| `downloadYouTube(url)` | Invoke | Spawns `yt-dlp` process for download. |
| `onDownloadProgress(cb)` | On | Listen for `%` progress updates. |
| `lookupMusicBrainz(mbid)` | Invoke | Proxy for MusicBrainz API requests. |
 
# 4. Frontend Architecture
 
## Component Hierarchy
 
*   **`App.tsx`**: Root container. Manages global state (`sortedMusicFiles`, `playingIndex`).
    *   **`TitleBar`**: Custom window controls (Minimize, Maximize, Close) via IPC.
    *   **`Sidebar`**: Filter navigation (All Songs, Artists, Albums).
    *   **`SongList`**: The primary data table.
        *   **`OverlayScrollbarsComponent`**: Handles virtualized scrolling for large lists.
        *   **`ScanStatusIcon`**: Visual indicator (✅, ⚠️, 🔄) rendered based on SQLite status.
    *   **`PlaybackBar`**: Persistent player footer.
        *   **`Howler`**: Audio instance managed by `useAudioPlayer`.
        *   **`VolumeControl`**: Slider input.
    *   **`Settings`**: Modal for configuration (Download Path, Reset Cache).
 
## Intelligent Release Selection Algorithm
Located in `src/utils/musicbrainzClient.ts`, `pickBestRelease()` ensures the correct album is tagged (avoiding compilations).
 
**Scoring Logic:**
1.  **Base Score:** 0
2.  **Official Release:** +100 points
3.  **Primary Type:** Album (+50), Single (+40), EP (+30)
4.  **Secondary Types (Penalties):** 
    *   Compilation: -200
    *   Soundtrack: -150
    *   Live: -50
5.  **Age Bonus:** Older releases get up to +50 points (assuming original is oldest).
 
**Example:** An original 1990 "Album" will score ~200. A 2005 "Greatest Hits" (Compilation) will score ~ -50.
 
# 5. Core Code Flows
 
## 1. "Fix Metadata" Workflow (Detailed)
 
1.  **User Action:** Click "Magic Wand" icon on a song.
2.  **Renderer:** `useSongScanner` hook is triggered.
3.  **Fingerprinting:** `generateFingerprint()` reads first 2 mins of audio using `fpcalc` (simulated via `chromaprint-wasm` or native binary).
4.  **AcoustID Lookup:** `lookupFingerprint(hash)` calls AcoustID API. Returns MBID.
5.  **MusicBrainz Lookup:** `lookupRecording(mbid)` fetches release candidates.
6.  **Release Selection:** `pickBestRelease()` algorithm executes.
7.  **Cover Art:** `getCoverArtUrls()` tries 250px -> 500px -> Original for the selected release ID.
8.  **Tagging:** 
    *   Image downloaded to temp path.
    *   `writeMetadata(path, meta)` IPC called.
    *   Backend reads file -> Remove existing tags -> Write new ID3v2.4 tags -> Save.
9.  **Cache Update:** `markFileScanned()` updates SQLite row with `hasMetadata=1`.
 
## 2. YouTube Download Flow
 
1.  **Backend:** `binaryManager.ts` ensures `yt-dlp.exe` exists and is executable.
2.  **Execution:** `spawn` process:
    ```bash
    yt-dlp -x --audio-format mp3 --audio-quality 0 --add-metadata --embed-thumbnail [URL] -o [Template]
    ```
3.  **Progress Parsng:** Stdout is parsed via regex `[download] (\d+.\d+)%` and sent to Renderer.
4.  **Completion:** File move to "Music Folder" if needed.
 
# 6. Conclusion
 
## Performance Considerations
*   **Virtual DOM:** `OverlayScrollbars` is essential for lists > 1,000 items.
*   **IPC Payload:** Transmitting Base64 images is the main bottleneck.
*   **SQLite Indices:** The `idx_file_hash` index ensures O(1) lookups during scan.
 
## Security
*   `contextBridge` prevents full Node.js access in the UI.
*   `webSecurity: false` in `main.ts` is a necessary evil to load local audio files via `file://` protocol, but is mitigated by disabling remote module access and `nodeIntegration`.
