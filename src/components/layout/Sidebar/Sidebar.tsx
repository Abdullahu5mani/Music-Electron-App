import { useState, useMemo } from 'react'
import './Sidebar.css'

interface MusicFileData {
  metadata?: {
    artist?: string
    album?: string
    albumArt?: string
  }
}

interface SidebarProps {
  selectedView: string
  onViewChange: (view: string) => void
  musicFiles: MusicFileData[]
}

export function Sidebar({ selectedView, onViewChange, musicFiles }: SidebarProps) {
  // Collapsible section states
  const [artistsCollapsed, setArtistsCollapsed] = useState(false)
  const [albumsCollapsed, setAlbumsCollapsed] = useState(false)

  // Search states
  const [artistSearch, setArtistSearch] = useState('')
  const [albumSearch, setAlbumSearch] = useState('')

  // Extract unique artists from music files
  const artists = useMemo(() => {
    return Array.from(
      new Set(
        musicFiles
          .map(file => file.metadata?.artist)
          .filter((artist): artist is string => !!artist)
      )
    ).sort()
  }, [musicFiles])

  // Extract unique albums with their cover art
  const albumsWithArt = useMemo(() => {
    const albumMap = new Map<string, string | undefined>()

    musicFiles.forEach(file => {
      const album = file.metadata?.album
      if (album && !albumMap.has(album)) {
        // Get cover art for this album
        albumMap.set(album, file.metadata?.albumArt)
      }
    })

    return Array.from(albumMap.entries())
      .map(([name, art]) => ({ name, art }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [musicFiles])

  // Filter artists based on search
  const filteredArtists = useMemo(() => {
    if (!artistSearch.trim()) return artists
    const query = artistSearch.toLowerCase()
    return artists.filter(artist => artist.toLowerCase().includes(query))
  }, [artists, artistSearch])

  // Filter albums based on search
  const filteredAlbums = useMemo(() => {
    if (!albumSearch.trim()) return albumsWithArt
    const query = albumSearch.toLowerCase()
    return albumsWithArt.filter(album => album.name.toLowerCase().includes(query))
  }, [albumsWithArt, albumSearch])

  return (
    <div className="sidebar">
      {/* Playlists section - for future playlist implementation */}
      <div className="sidebar-section playlists-section">
        <h3 className="sidebar-title">Playlists</h3>
        <button
          className={`sidebar-item ${selectedView === 'all' ? 'active' : ''}`}
          onClick={() => onViewChange('all')}
        >
          <span>🎵</span>
          <span>All Songs</span>
        </button>
      </div>

      {/* Artists section */}
      {artists.length > 0 && (
        <div className={`sidebar-section ${artistsCollapsed ? 'collapsed' : 'expanded'}`}>
          <div
            className="sidebar-title collapsible"
            onClick={() => setArtistsCollapsed(!artistsCollapsed)}
          >
            <span className={`collapse-icon ${artistsCollapsed ? 'collapsed' : ''}`}>▼</span>
            <span>Artists ({artists.length})</span>
          </div>

          {!artistsCollapsed && (
            <>
              {artists.length > 5 && (
                <div className="sidebar-search">
                  <input
                    type="text"
                    placeholder="Search artists..."
                    value={artistSearch}
                    onChange={(e) => setArtistSearch(e.target.value)}
                    className="sidebar-search-input"
                  />
                </div>
              )}
              <div className="sidebar-list">
                {filteredArtists.map((artist) => (
                  <button
                    key={artist}
                    className={`sidebar-item ${selectedView === `artist:${artist}` ? 'active' : ''}`}
                    onClick={() => onViewChange(`artist:${artist}`)}
                  >
                    <span className="artist-icon">👤</span>
                    <span>{artist}</span>
                  </button>
                ))}
                {filteredArtists.length === 0 && artistSearch && (
                  <div className="sidebar-no-results">No artists found</div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Albums section */}
      {albumsWithArt.length > 0 && (
        <div className={`sidebar-section ${albumsCollapsed ? 'collapsed' : 'expanded'}`}>
          <div
            className="sidebar-title collapsible"
            onClick={() => setAlbumsCollapsed(!albumsCollapsed)}
          >
            <span className={`collapse-icon ${albumsCollapsed ? 'collapsed' : ''}`}>▼</span>
            <span>Albums ({albumsWithArt.length})</span>
          </div>

          {!albumsCollapsed && (
            <>
              {albumsWithArt.length > 5 && (
                <div className="sidebar-search">
                  <input
                    type="text"
                    placeholder="Search albums..."
                    value={albumSearch}
                    onChange={(e) => setAlbumSearch(e.target.value)}
                    className="sidebar-search-input"
                  />
                </div>
              )}
              <div className="sidebar-list">
                {filteredAlbums.map((album) => (
                  <button
                    key={album.name}
                    className={`sidebar-item album-item ${selectedView === `album:${album.name}` ? 'active' : ''}`}
                    onClick={() => onViewChange(`album:${album.name}`)}
                  >
                    {album.art ? (
                      <img src={album.art} alt="" className="album-thumb" />
                    ) : (
                      <div className="album-thumb-placeholder">💿</div>
                    )}
                    <span>{album.name}</span>
                  </button>
                ))}
                {filteredAlbums.length === 0 && albumSearch && (
                  <div className="sidebar-no-results">No albums found</div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
