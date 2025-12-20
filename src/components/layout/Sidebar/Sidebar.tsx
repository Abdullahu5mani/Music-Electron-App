import { useState, useMemo } from 'react'
import { PlaylistList } from '../../playlists'
import type { Playlist } from '../../../types/electron.d'
import logoIcon from '../../../assets/logo.svg'
import musicNoteIcon from '../../../assets/icons/music-note.svg'
import chevronDownIcon from '../../../assets/icons/chevron-down.svg'
import userIcon from '../../../assets/icons/user.svg'
import discIcon from '../../../assets/icons/disc.svg'
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
  // Playlist props
  playlists?: Playlist[]
  selectedPlaylistId?: number | null
  onPlaylistClick?: (playlistId: number) => void
  onCreatePlaylist?: () => void
  onDeletePlaylist?: (playlistId: number) => void
}

export function Sidebar({
  selectedView,
  onViewChange,
  musicFiles,
  playlists = [],
  selectedPlaylistId = null,
  onPlaylistClick,
  onCreatePlaylist,
  onDeletePlaylist
}: SidebarProps) {
  // Collapsible section states
  const [artistsCollapsed, setArtistsCollapsed] = useState(false)
  const [albumsCollapsed, setAlbumsCollapsed] = useState(false)
  const [playlistsCollapsed, setPlaylistsCollapsed] = useState(false)

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

  // Handle playlist click - clears current view and selects playlist
  const handlePlaylistClick = (playlistId: number) => {
    onViewChange(`playlist:${playlistId}`)
    onPlaylistClick?.(playlistId)
  }

  return (
    <div className="sidebar">
      {/* App Logo and Name */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <img src={logoIcon} alt="" className="logo-icon" />
          <span className="logo-text">Music Sync</span>
        </div>
      </div>
      {/* Unified Playlists section - includes All Songs + user playlists */}
      <div className={`sidebar-section playlists-section ${playlistsCollapsed ? 'collapsed' : 'expanded'}`}>
        <div
          className="sidebar-title collapsible"
          onClick={() => setPlaylistsCollapsed(!playlistsCollapsed)}
        >
          <img src={chevronDownIcon} alt="" className={`collapse-icon ${playlistsCollapsed ? 'collapsed' : ''}`} />
          <span>Playlists</span>
        </div>

        <div className="sidebar-list">
          {/* All Songs - always at the top */}
          <button
            className={`sidebar-item ${selectedView === 'all' ? 'active' : ''}`}
            onClick={() => onViewChange('all')}
          >
            <img src={musicNoteIcon} alt="" className="playlist-icon-emoji" />
            <span>All Songs</span>
          </button>

          {/* User playlists */}
          <PlaylistList
            playlists={playlists}
            selectedPlaylistId={selectedPlaylistId}
            onPlaylistClick={handlePlaylistClick}
            onCreateNew={onCreatePlaylist || (() => { })}
            onDeletePlaylist={onDeletePlaylist}
          />
        </div>
      </div>

      {/* Artists section */}
      {artists.length > 0 && (
        <div className={`sidebar-section ${artistsCollapsed ? 'collapsed' : 'expanded'}`}>
          <div
            className="sidebar-title collapsible"
            onClick={() => setArtistsCollapsed(!artistsCollapsed)}
          >
            <img src={chevronDownIcon} alt="" className={`collapse-icon ${artistsCollapsed ? 'collapsed' : ''}`} />
            <span>Artists ({artists.length})</span>
          </div>

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
                <img src={userIcon} alt="" className="artist-icon" />
                <span>{artist}</span>
              </button>
            ))}
            {filteredArtists.length === 0 && artistSearch && (
              <div className="sidebar-no-results">No artists found</div>
            )}
          </div>
        </div>
      )}

      {/* Albums section */}
      {albumsWithArt.length > 0 && (
        <div className={`sidebar-section ${albumsCollapsed ? 'collapsed' : 'expanded'}`}>
          <div
            className="sidebar-title collapsible"
            onClick={() => setAlbumsCollapsed(!albumsCollapsed)}
          >
            <img src={chevronDownIcon} alt="" className={`collapse-icon ${albumsCollapsed ? 'collapsed' : ''}`} />
            <span>Albums ({albumsWithArt.length})</span>
          </div>

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
                  <img src={discIcon} alt="" className="album-thumb-placeholder" />
                )}
                <span>{album.name}</span>
              </button>
            ))}
            {filteredAlbums.length === 0 && albumSearch && (
              <div className="sidebar-no-results">No albums found</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

