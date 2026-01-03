<p align="center">
  <img src="src/assets/logo.png" alt="Music Sync App Logo" width="128" height="128">
</p>

<h1 align="center">Music Electron App</h1>

<p align="center">
  <a href="https://www.electronjs.org/">
    <img src="https://img.shields.io/badge/Electron-20.0+-47848F?style=flat-square&logo=electron&logoColor=white" alt="Electron">
  </a>
  <a href="https://react.dev/">
    <img src="https://img.shields.io/badge/React-18.2-61DAFB?style=flat-square&logo=react&logoColor=white" alt="React">
  </a>
  <a href="https://www.typescriptlang.org/">
    <img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
  </a>
  <img src="https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-blue?style=flat-square" alt="Platform">
</p>

<p align="center">
  <b>A modern, beautiful, and powerful offline music player built with web technologies.</b>
</p>

---

## Features

- **Extensive Format Support**: Plays `mp3`, `flac`, `opus`, `ogg`, `wav`, `aac`, `m4a`, `wma`, `aiff`, `amr`, and `webm`.
- **YouTube Downloader**: Built-in tool to download high-quality audio with automatic metadata tagging and thumbnail embedding.
- **Smart Identification**: Identify unknown tracks using audio fingerprinting (AcoustID + MusicBrainz).
- **AI Lyrics**: Generate synchronized lyrics locally using OpenAI Whisper.
- **Beautiful UI**: Glassmorphism design with a real-time audio visualizer.
- **Playlist Management**: Create, edit, and manage playlists seamlessly.
- **Metadata Editor**: Auto-reads ID3 tags; edit artist, album, and cover art.
- **System Tray**: Control playback from the background.

---

## Screenshots

### Main Interface
<p align="center">
  <img src="Screenshots/main-interface.gif" alt="Main Interface Demo" width="100%">
</p>

### YouTube Downloads
<p align="center">
  <img src="Screenshots/youtube-download.gif" alt="YouTube Downloading Demo" width="100%">
</p>

### Song Identification (AcoustID)
<p align="center">
  <img src="Screenshots/song-identification.gif" alt="Song Identification Demo" width="100%">
</p>

### AI Lyrics Generation
<p align="center">
  <img src="Screenshots/lyrics-generation.gif" alt="Lyrics Generation Demo" width="100%">
</p>

### Playlist Management
<p align="center">
  <img src="Screenshots/playlist-management.gif" alt="Playlist Management Demo" width="100%">
</p>

---

## Installation

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher)
- [Git](https://git-scm.com/)

### Setup
```bash
# Clone the repository
git clone https://github.com/Abdullahu5mani/Music-Electron-App.git
cd Music-Electron-App

# Install dependencies (using legacy-peer-deps recommended for some Electron packages)
npm install --legacy-peer-deps

# Run in development mode
npm run dev
```

### Build for Production
To create an executable for your OS:
```bash
npm run build
```
The output file will be in the `dist/` folder.

---

## Shortcuts

| Action | Shortcut |
|--------|----------|
| **Play / Pause** | `Space` |
| **Next Track** | `Arrow Right` |
| **Previous Track** | `Arrow Left` |
| **Volume Up** | `Arrow Up` |
| **Volume Down** | `Arrow Down` |
| **Mute** | `M` |

---

## 🏗️ Technical Architecture

This application leverages several external binaries and APIs to provide its advanced features. All binaries are **automatically downloaded on first use** and managed by the application.

### 📦 Binary Management

The app stores downloaded binaries in the user's app data directory:
- **Windows**: `%APPDATA%\Music-Electron-App\`
- **macOS**: `~/Library/Application Support/Music-Electron-App/`
- **Linux**: `~/.config/Music-Electron-App/`

Each binary is downloaded from its official GitHub releases and is platform/architecture-specific (x64, ARM64).

---

## 📥 yt-dlp Integration

### What is yt-dlp?
[yt-dlp](https://github.com/yt-dlp/yt-dlp) is a feature-rich command-line audio/video downloader forked from youtube-dl. It supports downloading from YouTube and many other sites.

### Binary Management
| Platform | Binary Name | Source |
|----------|-------------|--------|
| Windows x64 | `yt-dlp.exe` | GitHub Releases |
| Windows ARM64 | `yt-dlp_win_arm64.exe` | GitHub Releases |
| macOS Intel | `yt-dlp_macos` | GitHub Releases |
| macOS Apple Silicon | `yt-dlp_macos_arm64` | GitHub Releases |
| Linux x64 | `yt-dlp_linux` | GitHub Releases |
| Linux ARM64 | `yt-dlp_linux_arm64` | GitHub Releases |

**Storage Location**: `{userData}/yt-dlp-binaries/`

### How It Works
1. **Version Check**: On each download, the app checks the installed version against the latest GitHub release (`https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest`).
2. **Auto-Update**: If a newer version is available, it's automatically downloaded.
3. **Download Process**:
   ```
   yt-dlp <URL> --extract-audio --audio-format mp3 --audio-quality 0 \
          --embed-thumbnail --add-metadata --output "%(title)s.%(ext)s"
   ```
4. **Post-Processing**: The downloaded audio is converted to MP3 with embedded metadata and cover art.

### Node.js Integration
The app uses [`yt-dlp-wrap`](https://www.npmjs.com/package/yt-dlp-wrap) as a Node.js wrapper around the binary, providing:
- Progress events with percentage, speed, and ETA
- Automatic binary path resolution
- Promise-based API for async/await usage

### Rate Limiting
To avoid rate limiting from YouTube, the app enforces a **10-second delay** between consecutive downloads.

---

## 🎤 OpenAI Whisper Integration

### What is Whisper?
[Whisper.cpp](https://github.com/ggml-org/whisper.cpp) is a high-performance C/C++ port of OpenAI's Whisper automatic speech recognition model. The app uses it to generate lyrics by transcribing audio locally.

### Binary Management
| Platform | Source | Notes |
|----------|--------|-------|
| Windows x64 | Pre-built ZIP from GitHub | Auto-downloaded |
| Windows x86 | Pre-built ZIP from GitHub | Auto-downloaded |
| macOS | **System install required** | `brew install whisper-cpp` |
| Linux | **System install required** | Package manager or build from source |

**Storage Location**: `{userData}/whisper-binary/`

### Model Files
Whisper requires a model file for transcription. Available models (downloaded from HuggingFace):

| Model | Size | Speed | Accuracy | Best For |
|-------|------|-------|----------|----------|
| `tiny.en` | 75 MB | Fastest | Lowest | Quick previews |
| `base.en` | 142 MB | Fast | Good | Clear audio |
| `small.en` | 466 MB | Balanced | Better | **Recommended** |
| `medium.en` | 1.5 GB | Slow | High | Complex audio |
| `large` | 1.6 GB | Slowest | Best | Multilingual |

**Model Source**: `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/{model_filename}`

### How It Works
1. **Audio Preprocessing**: Audio is converted to 16kHz mono WAV format (Whisper's preferred format).
2. **Transcription Command**:
   ```
   whisper-cli -m <model_path> -f <audio_path> -l en --output-txt --no-timestamps
   ```
3. **Output**: Plain text lyrics are extracted and can be saved/displayed.

### Platform-Specific Installation
- **Windows**: Click "Install" in Settings → Binaries. The app downloads and extracts the binary automatically.
- **macOS**: Run `brew install whisper-cpp` in Terminal. The app detects system-installed binaries at `/opt/homebrew/bin/` or `/usr/local/bin/`.
- **Linux**: 
  - Ubuntu/Debian: `sudo apt install whisper.cpp`
  - Or build from source: https://github.com/ggml-org/whisper.cpp

---

## 🔍 Song Identification Pipeline

The app identifies unknown songs using **audio fingerprinting** and **metadata lookup**. This is a multi-step process involving several APIs.

### Pipeline Overview
```
┌─────────────────────────────────────────────────────────────────┐
│                    SONG IDENTIFICATION FLOW                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Audio File                                                    │
│       │                                                         │
│       ▼                                                         │
│   ┌─────────────────────────────────────────┐                   │
│   │   1. FINGERPRINT GENERATION             │                   │
│   │   ─────────────────────────────         │                   │
│   │   Tool: fpcalc (Chromaprint CLI)        │                   │
│   │   Output: Audio fingerprint + duration  │                   │
│   └─────────────────────────────────────────┘                   │
│       │                                                         │
│       ▼                                                         │
│   ┌─────────────────────────────────────────┐                   │
│   │   2. ACOUSTID LOOKUP                    │                   │
│   │   ─────────────────────────             │                   │
│   │   API: api.acoustid.org/v2/lookup       │                   │
│   │   Input: Fingerprint + Duration         │                   │
│   │   Output: MusicBrainz Recording ID      │                   │
│   │   Min. Score: 70% confidence            │                   │
│   └─────────────────────────────────────────┘                   │
│       │                                                         │
│       ▼                                                         │
│   ┌─────────────────────────────────────────┐                   │
│   │   3. MUSICBRAINZ METADATA               │                   │
│   │   ─────────────────────────             │                   │
│   │   API: musicbrainz.org                  │                   │
│   │   Input: Recording MBID                 │                   │
│   │   Output: Title, Artist, Album, Year    │                   │
│   └─────────────────────────────────────────┘                   │
│       │                                                         │
│       ▼                                                         │
│   ┌─────────────────────────────────────────┐                   │
│   │   4. COVER ART ARCHIVE                  │                   │
│   │   ─────────────────────────             │                   │
│   │   API: coverartarchive.org              │                   │
│   │   Input: Release MBID                   │                   │
│   │   Output: Album artwork image           │                   │
│   └─────────────────────────────────────────┘                   │
│       │                                                         │
│       ▼                                                         │
│   Song Identified with Full Metadata!                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### 🎵 Step 1: Audio Fingerprinting (Chromaprint/fpcalc)

**What is it?**  
[Chromaprint](https://acoustid.org/chromaprint) is an audio fingerprinting library that generates a unique identifier from audio content. The `fpcalc` binary is the command-line tool.

**Binary Details:**
| Platform | Binary | Version |
|----------|--------|---------|
| Windows x64 | `fpcalc.exe` | 1.6.0 |
| macOS x64 | `fpcalc` | 1.6.0 |
| macOS ARM64 | `fpcalc` | 1.6.0 |
| Linux x64 | `fpcalc` | 1.6.0 |
| Linux ARM64 | `fpcalc` | 1.6.0 |

**Storage Location**: `{userData}/fpcalc-binary/`  
**Source**: [Chromaprint GitHub Releases](https://github.com/acoustid/chromaprint/releases)

**Command Used**:
```bash
fpcalc -json "/path/to/audio.mp3"
```

**Output Format**:
```json
{
  "fingerprint": "AQADtImSZEmyJE...",
  "duration": 245.32
}
```

**Performance**: Uses a worker pool for parallel batch fingerprinting to maximize throughput when scanning multiple songs.

---

### 🔎 Step 2: AcoustID API Lookup

**API Endpoint**: `https://api.acoustid.org/v2/lookup`

**What is AcoustID?**  
[AcoustID](https://acoustid.org/) is a free audio identification service that maps Chromaprint fingerprints to MusicBrainz recordings.

**Request Parameters**:
| Parameter | Value |
|-----------|-------|
| `client` | Application API key |
| `fingerprint` | Chromaprint fingerprint |
| `duration` | Audio duration in seconds |
| `meta` | `recordings` |

**Example Response**:
```json
{
  "status": "ok",
  "results": [{
    "score": 0.95,
    "recordings": [{
      "id": "mbid-recording-id",
      "title": "Song Title",
      "artists": [{ "name": "Artist Name" }]
    }]
  }]
}
```

**Matching Threshold**: Only matches with a confidence score ≥ 70% (`0.7`) are accepted.

**Rate Limiting**: AcoustID allows ~3 requests/second. The app uses a 500ms delay between calls to stay safely within limits.

---

### 📚 Step 3: MusicBrainz Metadata Lookup

**API**: MusicBrainz Web Service v2  
**Library Used**: [`musicbrainz-api`](https://www.npmjs.com/package/musicbrainz-api)

**What is MusicBrainz?**  
[MusicBrainz](https://musicbrainz.org/) is an open music encyclopedia that provides structured metadata about artists, recordings, releases, and more.

**Data Retrieved**:
- Track title
- Artist name(s) with credit info
- Release/album title
- Release date
- Release type (Album, Single, EP, Compilation, Soundtrack, etc.)
- Release group ID (for cover art fallback)

**Release Selection Logic**:  
When a song appears on multiple releases (original album, compilations, soundtracks), the app uses a scoring system to pick the "best" (most likely original) release:

| Factor | Score Impact |
|--------|--------------|
| Official status | +100 |
| Album type | +50 |
| Single type | +40 |
| Compilation | -200 |
| Soundtrack | -150 |
| Earlier release date | +1 per year older |

**Rate Limiting**: MusicBrainz requires ~1 request/second. The app uses a 1100ms delay between calls.

---

### 🖼️ Step 4: Cover Art Archive

**API Endpoint**: `https://coverartarchive.org/`

**What is Cover Art Archive?**  
The [Cover Art Archive](https://coverartarchive.org/) is a joint project between MusicBrainz and the Internet Archive to provide cover art for releases.

**URL Patterns**:
```
# Release cover (preferred)
https://coverartarchive.org/release/{mbid}/front-250  # 250px thumbnail
https://coverartarchive.org/release/{mbid}/front-500  # 500px
https://coverartarchive.org/release/{mbid}/front      # Full size

# Release group fallback
https://coverartarchive.org/release-group/{mbid}/front-250
```

**Fallback Strategy**:  
The app tries multiple URLs in order until one succeeds:
1. 250px images from each release
2. 500px images from each release
3. Full-size images from each release
4. Release group images (works when individual releases lack art)

**Rate Limiting**: Follows MusicBrainz rules (~1 request/second).

---

## 🌐 API Summary

| Service | Endpoint | Rate Limit | Purpose |
|---------|----------|------------|---------|
| **AcoustID** | `api.acoustid.org/v2/lookup` | 3 req/sec | Fingerprint → MBID |
| **MusicBrainz** | `musicbrainz.org/ws/2/` | 1 req/sec | MBID → Metadata |
| **Cover Art Archive** | `coverartarchive.org` | 1 req/sec | MBID → Album Art |
| **yt-dlp Releases** | `api.github.com/repos/yt-dlp/yt-dlp` | - | Binary updates |
| **Whisper Models** | `huggingface.co/ggerganov/whisper.cpp` | - | Model downloads |
| **Chromaprint Releases** | `github.com/acoustid/chromaprint` | - | Binary downloads |

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Made by <a href="https://github.com/Abdullahu5mani">Abdullahu5mani</a>
</p>
