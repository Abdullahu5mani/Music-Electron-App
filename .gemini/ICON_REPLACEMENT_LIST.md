# Custom Icons Needed for Music Sync App

## 📁 Current SVG Icons (in `src/assets/`)
These exist but may need redesign to match the new theme:

| Icon | File | Used In | Notes |
|------|------|---------|-------|
| Play | `playButton.svg` | PlaybackBar | ✓ Exists |
| Pause | `pauseButton.svg` | PlaybackBar | ✓ Exists |
| Previous/Backward | `backwardButton.svg` | PlaybackBar | ✓ Exists |
| Next/Forward | `forwardButton.svg` | PlaybackBar | ✓ Exists |
| Volume | `volumeControl.svg` | PlaybackBar | ✓ Exists |
| App Logo | `trayIcon.svg` | Sidebar, TitleBar, Playback placeholder | ✓ Exists |

---

## 🎨 NEW Icons to Create

### Playback Controls
| Icon Name | Emoji Currently | Location | Description |
|-----------|-----------------|----------|-------------|
| `shuffle.svg` | 🔀 | PlaybackBar | Crossed arrows for shuffle mode |
| `repeat.svg` | ↻ | PlaybackBar | Circular arrow for repeat off |
| `repeat-all.svg` | 🔁 | PlaybackBar | Circular arrows for repeat all |
| `repeat-one.svg` | 🔂 | PlaybackBar | Circular arrow with "1" for repeat one |

### Sidebar - Navigation
| Icon Name | Emoji Currently | Location | Description |
|-----------|-----------------|----------|-------------|
| `music-note.svg` | 🎵 | Sidebar logo, All Songs, Song placeholder | Music note icon |
| `chevron-down.svg` | ▼ | Sidebar section collapse | Small down chevron |
| `user.svg` | 👤 | Artist list items | Person/user silhouette |
| `disc.svg` | 💿 | Album placeholder | Vinyl disc or CD |
| `folder.svg` | 📁 | Playlist default icon | Folder icon |
| `plus.svg` | + | Create Playlist button | Plus sign |

### Window Controls (TitleBar)
| Icon Name | Emoji Currently | Location | Description |
|-----------|-----------------|----------|-------------|
| `minimize.svg` | − | TitleBar | Horizontal line |
| `maximize.svg` | □ | TitleBar | Empty square |
| `restore.svg` | ❐ | TitleBar | Overlapping squares |
| `close.svg` | × | TitleBar | X mark |

### Settings & Actions
| Icon Name | Emoji Currently | Location | Description |
|-----------|-----------------|----------|-------------|
| `settings.svg` | ⚙️ | Header | Gear/cog icon |
| `download.svg` | ⬇️ | Download button, notifications | Down arrow |
| `refresh.svg` | 🔄 | Settings binary refresh | Circular arrows |

### Lyrics Panel
| Icon Name | Emoji Currently | Location | Description |
|-----------|-----------------|----------|-------------|
| `microphone.svg` | 🎤 | Lyrics panel header | Microphone icon |
| `speaker.svg` | 🔊 | Lyrics processing stage | Speaker with waves |
| `robot.svg` | 🤖 | Lyrics AI processing stage | Robot face |
| `check.svg` | ✓ | Lyrics completed stage | Checkmark |
| `warning.svg` | ⚠️ | Lyrics disclaimer | Triangle with exclamation |

### Notifications & Toasts
| Icon Name | Emoji Currently | Location | Description |
|-----------|-----------------|----------|-------------|
| `success.svg` | ✅ | Toast notifications | Checkmark in circle |
| `error.svg` | ❌ | Toast notifications | X in circle |
| `info.svg` | ℹ️ | Toast notifications | Info "i" in circle |
| `warning.svg` | ⚠️ | Toast notifications | Warning triangle |

### Context Menu
| Icon Name | Emoji Currently | Location | Description |
|-----------|-----------------|----------|-------------|
| `play-circle.svg` | ▶️ | Play song | Play in circle |
| `playlist-add.svg` | ➕ | Add to playlist | Plus with list |
| `edit.svg` | ✏️ | Edit metadata | Pencil |
| `trash.svg` | 🗑️ | Delete | Trash can |
| `info-circle.svg` | ℹ️ | Song info | Info icon |

---

## 🎯 Design Guidelines

### Style
- **Stroke-based**: Use 1.5-2px strokes, not filled
- **Rounded**: Round line caps and joins
- **Viewbox**: 24x24 standard
- **Color**: Use `currentColor` for dynamic theming

### File Format
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <!-- paths here -->
</svg>
```

### Color Theme Reference
- Primary accent: `#6366f1` (indigo)
- Secondary accent: `#06b6d4` (cyan)
- Text/icons default: `#f0f6fc` (near white)
- Muted: `#8b949e`

---

## 📊 Priority Order

### High Priority (Most Visible)
1. `shuffle.svg`, `repeat.svg`, `repeat-all.svg`, `repeat-one.svg`
2. `music-note.svg` (used everywhere)
3. `settings.svg`
4. `minimize.svg`, `maximize.svg`, `restore.svg`, `close.svg`

### Medium Priority
5. `chevron-down.svg`
6. `user.svg`
7. `disc.svg`
8. `plus.svg`

### Lower Priority (Less Frequently Seen)
9. All lyrics panel icons
10. All notification icons
11. Context menu icons

---

## Total Icons Needed: ~30
- Window controls: 4
- Playback controls: 4  
- Sidebar icons: 6
- Settings/Actions: 3
- Lyrics: 5
- Notifications: 4
- Context menu: 5
