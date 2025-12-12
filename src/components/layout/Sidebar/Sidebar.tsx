import './Sidebar.css'

interface SidebarProps {
  selectedView: string
  onViewChange: (view: string) => void
  musicFiles: Array<{ metadata?: { artist?: string; album?: string } }>
}

export function Sidebar({ selectedView, onViewChange, musicFiles }: SidebarProps) {
  // Extract unique artists and albums from music files
  const artists = Array.from(
    new Set(
      musicFiles
        .map(file => file.metadata?.artist)
        .filter((artist): artist is string => !!artist)
    )
  ).sort()

  const albums = Array.from(
    new Set(
      musicFiles
        .map(file => file.metadata?.album)
        .filter((album): album is string => !!album)
    )
  ).sort()

  return (
    <div className="sidebar">
      <div className="sidebar-section">
        <h3 className="sidebar-title">Library</h3>
        <button
          className={`sidebar-item ${selectedView === 'all' ? 'active' : ''}`}
          onClick={() => onViewChange('all')}
        >
          <span>🎵</span>
          <span>All Songs</span>
        </button>
      </div>

      {artists.length > 0 && (
        <div className="sidebar-section">
          <h3 className="sidebar-title">Artists</h3>
          {artists.map((artist) => (
            <button
              key={artist}
              className={`sidebar-item ${selectedView === `artist:${artist}` ? 'active' : ''}`}
              onClick={() => onViewChange(`artist:${artist}`)}
            >
              <span>👤</span>
              <span>{artist}</span>
            </button>
          ))}
        </div>
      )}

      {albums.length > 0 && (
        <div className="sidebar-section">
          <h3 className="sidebar-title">Albums</h3>
          {albums.map((album) => (
            <button
              key={album}
              className={`sidebar-item ${selectedView === `album:${album}` ? 'active' : ''}`}
              onClick={() => onViewChange(`album:${album}`)}
            >
              <span>💿</span>
              <span>{album}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}



















