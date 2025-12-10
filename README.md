# Music Sync App

Modern Electron + React + TypeScript desktop player with local library scanning, YouTube audio downloads, audio fingerprinting (AcoustID + MusicBrainz), in-place metadata tagging, SQLite-backed scan cache, and a custom frameless UI with tray controls.

> Need more depth? See `ARCHITECTURE.md` for full diagrams and flow details.

---

## Highlights

- Local library scanner with metadata extraction and album art (music-metadata)
- Offline playback via Howler.js with seek, volume, shuffle/repeat, tray play/pause
- YouTube downloader (yt-dlp) with auto-binary download, progress, and rate limiting
- Audio fingerprinting (Chromaprint WASM) + MusicBrainz tagging (taglib-wasm)
- SQLite metadata cache for scan status, change detection, and batch progress
- Settings modal for music/download folders and binary status (platform-aware)
- Custom sidebar filters (artist/album), overlay scrollbars, and notifications
- Bundled FFmpeg (asar-unpacked) for metadata support

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Runtime | Electron 39 | Desktop container, tray, IPC |
| Frontend | React 18 + TS | UI and state management |
| Build | Vite 7 + vite-plugin-electron | Dev server & bundling |
| Audio | Howler.js | Playback engine |
| Metadata | music-metadata, taglib-wasm | Read/write tags & art |
| Fingerprinting | @unimusic/chromaprint (WASM) | AcoustID fingerprints |
| Downloads | yt-dlp-wrap | YouTube audio with embeds |
| Cache | better-sqlite3 | Scan/status persistence |
| UI | rc-slider, overlayscrollbars-react | Seek/volume + scrollbars |

---

## Project Layout

```
Music-Electron-App/
├── electron/                # Main process
│   ├── main.ts              # App bootstrap
│   ├── window.ts            # BrowserWindow config
│   ├── preload.ts           # Safe IPC bridge
│   ├── tray.ts              # System tray menu
│   ├── musicScanner.ts      # Recursive scan + metadata
│   ├── youtubeDownloader.ts # yt-dlp orchestration
│   ├── settings.ts          # JSON settings storage
│   ├── binaryManager.ts     # Binary status/version checks
│   ├── metadataCache.ts     # SQLite cache for scans
│   └── ipc/
│       ├── handlers.ts      # IPC registration entry
│       └── modules/         # Feature-specific IPC
├── src/                     # Renderer (React)
│   ├── App.tsx              # Main composition
│   ├── components/          # UI (TitleBar, Sidebar, PlaybackBar, etc.)
│   ├── hooks/               # useAudioPlayer, useMusicLibrary, useSongScanner
│   ├── utils/               # sortMusicFiles, fingerprintGenerator, clients
│   ├── electron.d.ts        # Renderer-side IPC typings
│   └── App.css              # Core styling
├── vite.config.ts           # Vite + Electron config
├── electron-builder.json5   # Packaging (asarUnpack for FFmpeg)
└── package.json             # Scripts and deps
```

---

## Getting Started

1) Install prerequisites: Node 18+ and npm.
2) Install dependencies:
```bash
npm install
```
3) Run in development (Electron + Vite with HMR):
```bash
npm run dev
```
4) Lint / Test:
```bash
npm run lint
npm run test        # vitest (jsdom + node env for electron paths)
```
5) Production build & package:
```bash
npm run build       # tsc + Vite + electron-builder
```

Built assets land in `dist/` and `dist-electron/`; electron-builder outputs installers under `dist/` by default.

---

## Scripts

| Script | What it does |
|--------|--------------|
| `npm run dev` | Start renderer + rebuild main/preload with HMR, launches Electron |
| `npm run build` | Type-check, bundle renderer, bundle main/preload, package app |
| `npm run build:web` | Bundle renderer only (no Electron packaging) |
| `npm run lint` | ESLint for TS/TSX |
| `npm run test` / `test:run` / `test:ui` | Vitest (jsdom for renderer, node for electron code) |
| `npm run test:coverage` | Vitest coverage (v8) |

---

## Core Architecture (short)

- **Main process (`electron/`)**
  - `main.ts`: app init, menus removed, IPC registration, tray creation, devtools shortcut.
  - `window.ts`: frameless window (pink/blue gradient bar), `webSecurity: false` for `file://`.
  - `preload.ts`: contextBridge exposes `electronAPI` (scan, download, settings, binaries, window controls, playback state, fingerprint helpers).
  - `tray.ts`: tray icon/menu with Show/Hide, Play/Pause, Quit; syncs with renderer playback state.
  - `musicScanner.ts`: recursive scan, metadata extraction, album art to base64.
  - `youtubeDownloader.ts`: yt-dlp download with binary bootstrap, title/progress events, 10s rate limit.
  - `settings.ts`: JSON settings in `app.getPath('userData')`.
  - `binaryManager.ts`: platform/arch-aware yt-dlp pathing, version checks, ffmpeg status.
  - `metadataCache.ts`: SQLite cache for scan status and change detection (SHA256 path+size+mtime).
  - `ipc/modules/*`: split handlers for music, APIs (AcoustID/MusicBrainz/cover art), YouTube, system, and cache.

- **Renderer (`src/`)**
  - `App.tsx`: wires hooks + components; manages download/batch scan toasts and settings modal.
  - Components: `TitleBar`, `Sidebar` (artist/album filters), `SongList`, `PlaybackBar`, `DownloadButton`, `DownloadNotification`, `NotificationToast`, `Settings`, batch scan UI.
  - Hooks: `useMusicLibrary` (scan/select/sort), `useAudioPlayer` (Howler playback + tray sync), `useSongScanner` (batch scan with rate limiting and in-place updates).
  - Utils: `sortMusicFiles`, `fingerprintGenerator` (Chromaprint WASM with per-file reinit + delays), `acoustidClient`, `musicbrainzClient`, `pathResolver`.
  - Styling: CSS with overlay scrollbars; padding accounts for fixed title/playback bars.

---

## IPC Surface (renderer ↔ main)

- Invoke: `scan-music-folder`, `select-music-folder`, `read-single-file-metadata`, `download-youtube`, `get-settings`, `save-settings`, `select-download-folder`, `get-binary-statuses`, `get-platform-info`, cache operations (status, mark scanned, stats), API lookups (AcoustID/MusicBrainz/cover art), `read-file-buffer` for fingerprinting.
- Send: `playback-state-changed`, `window-minimize`, `window-maximize`, `window-close`.
- Listen: `download-progress`, `download-title`, `binary-download-progress`, `window-state-changed`, `tray-play-pause`, scan/batch progress events.

Keep `src/electron.d.ts` in sync with `preload.ts` exports when adding new channels.

---

## Binaries and Platforms

- **yt-dlp**: downloaded at runtime to `userData/yt-dlp-binaries` if missing; asset chosen by `process.platform` + `process.arch` (win32 x64/arm64, darwin x64/arm64, linux x64/arm64). Corrupted binaries are deleted and redownloaded. Version checked against GitHub.
- **FFmpeg**: provided by `@ffmpeg-installer/ffmpeg`, unpacked via `asarUnpack` so executables run outside `app.asar`.
- **Binary status UI**: surfaced in Settings modal with installed/latest versions and update hints.

---

## Fingerprinting & Tagging

- Chromaprint WASM runs in renderer; per-file reinitialization, size limit (~50MB) and micro-delays to avoid memory exhaustion; circuit breaker after consecutive errors.
- Rate limiting between API calls (AcoustID, MusicBrainz, Cover Art Archive) to respect service limits.
- Cover art fallback chain tries multiple URLs (release 250/500/original, then release-group).
- Metadata writing via `taglib-wasm`; in-place state update (`updateSingleFile`) prevents library re-scan and preserves scroll position.

---

## Library Scan & Cache

- SQLite cache stores `{filePath, fileHash, scannedAt, mbid, hasMetadata}` for change detection.
- Statuses: `unscanned`, `scanned-tagged`, `scanned-no-match`, `file-changed`.
- Batch scan UI shows progress and supports cancellation; unscanned/change-detected files prioritized.

---

## Downloads

- yt-dlp exec with `--extract-audio --audio-format mp3 --embed-thumbnail --add-metadata`.
- Progress + title streamed to renderer; 10s cooldown between downloads to avoid rate limits.
- On success, library re-scan to pick up new file; toast notifications for success/error.

---

## Settings & Tray

- Settings JSON stores music/download folders; modal allows browsing both and viewing binary/platform info.
- Tray menu mirrors playback state (Play/Pause), toggles window visibility, and provides Quit.
- Window controls are custom (frameless) with minimize/maximize/close IPC.

---

## Testing & Troubleshooting

- Tests: `npm run test` (jsdom for renderer, node for electron code); `test:coverage` for reports.
- Lint: `npm run lint`.
- Reset yt-dlp: delete `%APPDATA%/music-sync-app/yt-dlp-binaries` (platform path) and retry download.
- Reset settings/cache: remove `%APPDATA%/music-sync-app/app-config.json` and `metadata-cache.db` (see paths above).
- FFmpeg not found after packaging: ensure `electron-builder.json5` keeps `asarUnpack` entry for `@ffmpeg-installer/ffmpeg`.

---

## Screenshots

See `screenshots/` for UI references (title bar, playback bar, sidebar, settings, toasts).
