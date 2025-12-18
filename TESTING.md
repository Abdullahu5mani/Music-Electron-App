# Testing Documentation - Music Sync App

This document outlines the comprehensive testing strategy, organized from the smallest units (utilities) to the largest integrations (full app workflows).

**Current Status:** ~96% Pass Rate (300 passing, 11 failing/skipped)

## 🏗️ Testing Architecture

- **Vitest**: Main test runner (fast, modern, Vite-native).
- **React Testing Library**: For testing React components in a way that resembles user behavior.
- **jsdom**: Simulates a browser environment for DOM-related tests.
- **Electron Mocks**: Extensive mocking of Electron's IPC patterns (`ipcRenderer`, `ipcMain`) to allow testing standard renderer code without a running Electron instance.

---

## � Complete Test File Specification

This section details every test file, the specific functions or components it tests, and the scenarios covered.

### 🛠️ Utilities & Helpers

#### `src/utils/__tests__/sortMusicFiles.test.ts`
**Tested Function**: `sortMusicFiles(files, criterion)`
- **Scenarios**:
  - **Title Sort**: Verifies alphabetical sorting by song title.
  - **Artist Sort**: Groups by Artist first, then sorts by Title within each artist.
  - **Track Sort**: Sorts by Album name first, then by Track Number (1, 2, 3...).
  - **Date Added**: Sorts by timestamp descending (Newest first).
  - **Edge Cases**: Handles songs with missing metadata (undefined artist/title) without crashing. Ensures original array is not mutated.

#### `src/utils/__tests__/colorExtractor.test.ts`
**Tested Function**: `extractColorsFromImage(buffer)`
- **Scenarios**:
  - **Success**: Extracts dominant, secondary, and accent colors from valid image buffers.
  - **Fallback**: Returns default color palette if image is invalid or empty.
  - **Format**: Ensures returned colors are valid Hex strings (e.g., `#FFFFFF`).

---

### 📡 Services (API & External)

#### `src/services/__tests__/musicbrainz.test.ts`
**Tested Functions**: `getCoverArtUrl`, `getCoverArtUrls`, `pickBestRelease`
- **`getCoverArtUrl`**: Validates construction of Cover Art Archive URLs from MBIDs.
- **`getCoverArtUrls`**:
  - Generates multiple resolutions (250px, 500px, original).
  - Implements fallback to "Release Group" images if "Release" images are missing.
  - Deduplicates URLs to prevent redundant network requests.
- **`pickBestRelease`** (Ranking Algorithm):
  - **Official vs Bootleg**: Prioritizes 'Official' status.
  - **Album vs Compilation**: Prioritizes 'Album' primary type.
  - **Date Priority**: prefers the earliest release date (Original vs Reissue).

#### `src/services/__tests__/acoustid.test.ts`
**Tested Function**: `lookupFingerprint(fingerprint)`
- **Scenarios**:
  - **API Success**: Parses AcoustID JSON response into usable score and recording ID.
  - **No Match**: Handles empty result sets gracefully.
  - **Rate Limit**: Simulates 429 errors and tests retry/error logic.

#### `src/services/__tests__/fingerprint.test.ts`
**Tested Function**: `generateFingerprint(filePath)`
- **Scenarios**:
  - **Process Spawning**: Tests correct arguments passed to `fpcalc` binary.
  - **Parsing**: Extracts duration and fingerprint string from stdout.
  - **Failure**: Handles binary not found or corrupt audio file errors.

---

### �️ Electron Backend (Main Process)

#### `electron/__tests__/musicScanner.test.ts`
**Tested Module**: `musicScanner.ts` (File System Logic)
- **`scanMusicFiles(dir)`**:
  - **Recursion**: Verifies it traverses subdirectories deeply.
  - **Filtering**: Ignores non-audio files (.txt, .jpg).
  - **Metadata**: Calls `parseFile` for every audio file found.
- **`readSingleFileMetadata(path)`**:
  - **Extraction**: Reads ID3v2/Vorbis tags.
  - **Album Art**: Converts raw image buffer to Base64 data URI.
  - **Validation**: returns `null` for non-existent files.

#### `electron/ipc/modules/__tests__/musicHandlers.test.ts`
**Tested Module**: IPC Wrapper for Scanner
- **`handle('scan-music-folder')`**: Ensures IPC arguments are correctly passed to `scanMusicFiles`.
- **`handle('read-single-file-metadata')`**: Verifies return value serialization across the IPC bridge.

#### `electron/ipc/modules/__tests__/playlistHandlers.test.ts`
**Tested Module**: Playlist Persistence (SQLite/JSON)
- **CRUD Operations**:
  - **Create**: storage of new playlists.
  - **Read**: Retrieval of all playlists and specific playlist songs.
  - **Update**: Adding/Removing songs updates the modified timestamp.
  - **Delete**: Removal of playlist files/entries.

#### `electron/__tests__/fileWatcher.test.ts`
**Tested Module**: `chokidar` wrapper
- **Scenarios**:
  - **Add Event**: Emits `file-added` when a new file appears in the library.
  - **Unlink Event**: Emits `file-removed` when a file is deleted.
  - **Filter**: Ignores changes to non-music files (e.g., .DS_Store).

---

### ⚛️ Frontend Components (UI)

#### `src/components/layout/PlaybackBar/__tests__/PlaybackBar.test.tsx`
**Tested Component**: `<PlaybackBar />` (Player Controls)
- **Visuals**:
  - Displays Song Title, Artist, Album Art.
  - Shows "No song selected" state.
- **Interactions**:
  - **Controls**: Play, Pause, Next, Previous, Shuffle, Repeat clicks fire correct callbacks.
  - **Seek**: Slider change calls `onSeek`.
  - **Volume**: Slider change calls `onVolumeChange`.
- **Logic**:
  - Time formatting (e.g., `125` -> `2:05`).
  - Active state toggling for Shuffle/Repeat buttons.

#### `src/components/library/SongList/__tests__/SongList.test.tsx`
**Tested Component**: `<SongList />` (Main Library View)
- **Rendering**:
  - Renders list of songs with columns (Title, Artist, Album, Duration).
  - Shows "No songs found" for empty states.
- **Sorting**:
  - Updates sort order when header is clicked (Title A-Z -> Z-A).
- **Interactions**:
  - **Selection**: Highlights the currently playing song.
  - **Context Menu**: Right-click opens menu with "Add to Playlist" options.

#### `src/components/library/BatchScanProgress/__tests__/BatchScanProgress.test.tsx`
**Tested Component**: `<BatchScanProgress />`
- **Scenarios**:
  - Visualizes percentage (`current / total`).
  - Shows current filename being scanned.
  - "Cancel" button triggers cancellation callback.

---

### 🪝 Custom Hooks (Logic)

#### `src/hooks/__tests__/useSongScanner.test.tsx`
**Tested Functionality**: Song Identification Pipeline
- **`scanSong(file)`**:
  - **Step 1**: Calls fingerprint service.
  - **Step 2**: Calls AcoustID service with fingerprint.
  - **Step 3**: Calls MusicBrainz with recording ID.
  - **Step 4**: Writes tags to file.
- **Error Handling**:
  - Returns `scanned-no-match` if any step returns empty.
  - Handles network timeouts gracefully.

#### `src/hooks/__tests__/usePlaylists.test.tsx`
**Tested Functionality**: Playlist State Management
- **Scenarios**:
  - **Load**: Fetches playlists on mount.
  - **Create**: Optimistically adds new playlist to local state before API confirms.
  - **Add Song**: Updates song count immediately for UI responsiveness.

---

### 🔄 Integration Flows

#### `src/__tests__/integration/downloadFlow.test.tsx`
**Flow**: YouTube Download -> Library Update
1.  **Input**: User enters YouTube URL.
2.  **Process**: Mocks `yt-dlp` download progress events.
3.  **Result**: Verifies a new `MusicFile` is added to the library state and displayed in the list.

#### `src/__tests__/integration/scanFlow.test.tsx`
**Flow**: Folder Selection -> Database Population
1.  **Trigger**: User clicks "Scan Library".
2.  **Mocking**: Simulates `electron.scanMusicFiles` returning 5 files.
3.  **Validation**: Verifies `SongList` updates to show 5 items and "Scan Complete" toast appears.

---

## 🛠️ Troubleshooting & Common Issues

### "ReferenceError: window is not defined"
*   **Cause**: Importing a file using `window.electronAPI` outside a test env.
*   **Fix**: Add `// @vitest-environment jsdom` to the top of the file.

### "Element not found" in `waitFor`
*   **Cause**: Async timeout.
*   **Fix**: Use `await screen.findByText(...)` and increase timeout if needed.

### "act(...) warning"
*   **Cause**: Unawaited state updates.
*   **Fix**: Wrap interactions in `await userEvent.click()` or `act()`.

