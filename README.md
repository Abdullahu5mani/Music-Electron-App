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

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Made by <a href="https://github.com/Abdullahu5mani">Abdullahu5mani</a>
</p>
