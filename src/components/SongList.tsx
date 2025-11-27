import type { MusicFile } from '../../electron/musicScanner'
import type { SortOption } from '../utils/sortMusicFiles'

interface SongListProps {
  songs: MusicFile[]
  onSongClick: (file: MusicFile, index: number) => void
  playingIndex: number | null
  sortBy: SortOption
  onSortChange: (sortBy: SortOption) => void
}

/**
 * Component for displaying the list of songs
 */
export function SongList({ songs, onSongClick, playingIndex, sortBy, onSortChange }: SongListProps) {
  if (songs.length === 0) {
    return (
      <div className="music-list">
        <h2>Music Files (0)</h2>
        <p>No music files found. Select a folder to scan.</p>
      </div>
    )
  }

  return (
    <div className="music-list">
      <div className="music-list-header">
        <h2>Music Files ({songs.length})</h2>
        <div className="sort-controls">
          <label htmlFor="sort-select">Sort by:</label>
          <select
            id="sort-select"
            className="sort-select"
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
          >
            <option value="title">Title</option>
            <option value="artist">Artist</option>
            <option value="track">Track Number</option>
            <option value="dateAdded">Date Added</option>
          </select>
        </div>
      </div>
      <ul className="song-list">
        {songs.map((file, index) => (
          <li 
            key={index} 
            className={`song-item ${playingIndex === index ? 'playing' : ''}`}
            onClick={() => onSongClick(file, index)}
          >
            <div className="song-content">
              {file.metadata?.albumArt ? (
                <div className="album-art-container">
                  <img 
                    src={file.metadata.albumArt} 
                    alt={`${file.metadata.album || file.name} cover`}
                    className="album-art"
                  />
                </div>
              ) : (
                <div className="album-art-container no-art">
                  <span>🎵</span>
                </div>
              )}
              <div className="song-info">
                <div className="song-title">
                  {file.metadata?.title || file.name}
                </div>
                <div className="song-artist">
                  {file.metadata?.artist || 'Unknown Artist'}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

