import type { Playlist } from '../../types/electron.d'
import folderIcon from '../../assets/icons/folder.svg'
import trashIcon from '../../assets/icons/trash.svg'
import plusIcon from '../../assets/icons/plus.svg'
import './PlaylistList.css'

interface PlaylistListProps {
    playlists: Playlist[]
    selectedPlaylistId: number | null
    onPlaylistClick: (playlistId: number) => void
    onCreateNew: () => void
    onDeletePlaylist?: (playlistId: number) => void
}

/**
 * Displays user playlists with a create button
 * Used within the unified Playlists section in the Sidebar
 */
export function PlaylistList({
    playlists,
    selectedPlaylistId,
    onPlaylistClick,
    onCreateNew,
    onDeletePlaylist
}: PlaylistListProps) {
    return (
        <div className="playlist-list">
            {/* User playlists */}
            <div className="playlist-items">
                {playlists.map(playlist => (
                    <div
                        key={playlist.id}
                        className={`playlist-item ${selectedPlaylistId === playlist.id ? 'active' : ''}`}
                        onClick={() => onPlaylistClick(playlist.id)}
                    >
                        <div className="playlist-icon">
                            {playlist.coverArtPath ? (
                                <img src={playlist.coverArtPath} alt="" className="playlist-cover" />
                            ) : (
                                <img src={folderIcon} alt="" className="playlist-icon-default" />
                            )}
                        </div>
                        <div className="playlist-info">
                            <span className="playlist-name">{playlist.name}</span>
                            <span className="playlist-song-count">
                                {playlist.songCount} {playlist.songCount === 1 ? 'song' : 'songs'}
                            </span>
                        </div>
                        {onDeletePlaylist && (
                            <button
                                className="delete-playlist-btn"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    if (confirm(`Delete "${playlist.name}"?`)) {
                                        onDeletePlaylist(playlist.id)
                                    }
                                }}
                                title="Delete playlist"
                            >
                                <img src={trashIcon} alt="Delete" className="delete-icon" />
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {/* Create new playlist button */}
            <button
                className="create-playlist-item"
                onClick={onCreateNew}
                title="Create new playlist"
            >
                <img src={plusIcon} alt="" className="create-icon" />
                <span>Create Playlist</span>
            </button>
        </div>
    )
}
