import { useState, useEffect, useMemo, useCallback } from 'react'
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react'
import { useMusicLibrary } from './hooks/useMusicLibrary'
import { useAudioPlayer } from './hooks/useAudioPlayer'
import { useSongScanner } from './hooks/useSongScanner'
import { usePlaylists } from './hooks/usePlaylists'
// Layout components
import { TitleBar } from './components/layout/TitleBar/TitleBar'
import { Sidebar } from './components/layout/Sidebar/Sidebar'
import { PlaybackBar } from './components/layout/PlaybackBar/PlaybackBar'
// Library components
import { SongList } from './components/library/SongList/SongList'
import { BatchScanProgress } from './components/library/BatchScanProgress/BatchScanProgress'
// Settings components
import { Settings } from './components/settings/Settings/Settings'
// Download components
import { DownloadButton } from './components/download/DownloadButton/DownloadButton'
import { DownloadNotification } from './components/download/DownloadNotification/DownloadNotification'
// Common components
import { NotificationToast } from './components/common/NotificationToast/NotificationToast'
// Playlist components
import { CreatePlaylistModal } from './components/playlists'
// Lyrics components
import { LyricsPanel } from './components/lyrics'
// Types
import type { ScanStatusType } from './types/electron.d'
import type { VisualizerMode } from './components/common/AudioVisualizer/AudioVisualizer'
// Icons
import settingsIcon from './assets/icons/settings.svg'
import './App.css'

function App() {
  const { sortedMusicFiles, loading, error, selectedFolder, scanFolder, sortBy, setSortBy, updateSingleFile } = useMusicLibrary()
  const [selectedView, setSelectedView] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [scanStatuses, setScanStatuses] = useState<Record<string, ScanStatusType>>({})
  const [visualizerMode, setVisualizerMode] = useState<VisualizerMode>('bars')
  const [toastMessage, setToastMessage] = useState<string>('')
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('info')
  const [showToast, setShowToast] = useState(false)

  // Helper function to show toast
  const showToastNotification = useCallback((message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setToastMessage(message)
    setToastType(type)
    setShowToast(true)
  }, [])

  // Handle scan status updates from scanner
  const handleStatusUpdate = useCallback((filePath: string, status: ScanStatusType) => {
    setScanStatuses(prev => ({ ...prev, [filePath]: status }))
  }, [])

  // Initialize the song scanner hook
  const { batchProgress, scanBatch, cancelBatchScan } = useSongScanner({
    onShowNotification: showToastNotification,
    onUpdateSingleFile: updateSingleFile,
    onStatusUpdate: handleStatusUpdate
  })

  // Initialize the playlists hook
  const {
    playlists,
    activePlaylist,
    createPlaylist,
    deletePlaylist,
    addSongsToPlaylist,
    loadPlaylist,
    clearActivePlaylist
  } = usePlaylists({
    onShowNotification: showToastNotification,
    musicFiles: sortedMusicFiles
  })

  // Playlist modal state
  const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState(false)
  const [pendingSongsForPlaylist, setPendingSongsForPlaylist] = useState<string[]>([])
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<number | null>(null)

  // Playback context - stores what's currently being played (separate from view)
  // This allows viewing "All Songs" while still playing from a playlist
  const [playbackContext, setPlaybackContext] = useState<{
    type: 'all' | 'playlist' | 'artist' | 'album'
    name: string
    songs: typeof sortedMusicFiles
  }>({ type: 'all', name: 'All Songs', songs: sortedMusicFiles })

  // Update playback context when sortedMusicFiles changes (for "All Songs" context)
  useEffect(() => {
    if (playbackContext.type === 'all') {
      setPlaybackContext(prev => ({ ...prev, songs: sortedMusicFiles }))
    }
  }, [sortedMusicFiles])

  // Filter music files based on selected view (for display only)
  const filteredMusicFiles = useMemo(() => {
    let base = sortedMusicFiles

    if (selectedView.startsWith('artist:')) {
      const artist = selectedView.replace('artist:', '')
      base = base.filter(file => file.metadata?.artist === artist)
    } else if (selectedView.startsWith('album:')) {
      const album = selectedView.replace('album:', '')
      base = base.filter(file => file.metadata?.album === album)
    } else if (selectedView.startsWith('playlist:') && activePlaylist) {
      // Show songs from the active playlist
      base = activePlaylist.songs
    }

    const query = searchTerm.trim().toLowerCase()
    if (!query) return base

    return base.filter(file => {
      const title = (file.metadata?.title || file.name || '').toLowerCase()
      const artist = (file.metadata?.artist || '').toLowerCase()
      const album = (file.metadata?.album || '').toLowerCase()
      return title.includes(query) || artist.includes(query) || album.includes(query)
    })
  }, [sortedMusicFiles, selectedView, searchTerm, activePlaylist])

  // Use playback context for audio player (NOT the view's filteredMusicFiles)
  // This ensures playback stays within the context where it started
  const {
    playingIndex,
    playSong: playSongFromContext,
    togglePlayPause,
    playNext,
    playPrevious,
    shuffle,
    repeatMode,
    toggleShuffle,
    cycleRepeatMode,
    isPlaying,
    currentTime,
    duration,
    seek,
    volume,
    setVolume,
    currentSound,
  } = useAudioPlayer(playbackContext.songs)

  // Wrapper to play song that also sets the playback context
  const playSong = useCallback((file: typeof sortedMusicFiles[0], index: number) => {
    // Determine the context based on current view
    if (selectedView.startsWith('playlist:') && activePlaylist) {
      setPlaybackContext({
        type: 'playlist',
        name: activePlaylist.name,
        songs: activePlaylist.songs
      })
    } else if (selectedView.startsWith('artist:')) {
      const artist = selectedView.replace('artist:', '')
      setPlaybackContext({
        type: 'artist',
        name: artist,
        songs: filteredMusicFiles
      })
    } else if (selectedView.startsWith('album:')) {
      const album = selectedView.replace('album:', '')
      setPlaybackContext({
        type: 'album',
        name: album,
        songs: filteredMusicFiles
      })
    } else {
      setPlaybackContext({
        type: 'all',
        name: 'All Songs',
        songs: sortedMusicFiles
      })
    }

    // Play the song
    playSongFromContext(file, index)
  }, [selectedView, activePlaylist, filteredMusicFiles, sortedMusicFiles, playSongFromContext])
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [binaryDownloadStatus, setBinaryDownloadStatus] = useState<string>('')
  const [binaryDownloadProgress, setBinaryDownloadProgress] = useState(0)
  const [downloadTitle, setDownloadTitle] = useState<string>('')
  const [showNotification, setShowNotification] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [downloadFolder, setDownloadFolder] = useState<string | null>(null)

  // Lyrics panel state
  const [showLyricsPanel, setShowLyricsPanel] = useState(false)
  const [lyricsText, setLyricsText] = useState<string | null>(null)
  const [lyricsProgress, setLyricsProgress] = useState<{ step: string; percentage: number } | null>(null)
  const [lyricsSongName, setLyricsSongName] = useState('')
  const [isProcessingLyrics, setIsProcessingLyrics] = useState(false)

  // Listen for download progress updates
  useEffect(() => {
    if (window.electronAPI?.onDownloadProgress) {
      const cleanup = window.electronAPI.onDownloadProgress((progress) => {
        setDownloadProgress(progress.percentage)
      })
      return cleanup
    }
  }, [])

  // Listen for binary download progress updates
  useEffect(() => {
    if (window.electronAPI?.onBinaryDownloadProgress) {
      const cleanup = window.electronAPI.onBinaryDownloadProgress((progress) => {
        setBinaryDownloadStatus(progress.message)
        setBinaryDownloadProgress(progress.percentage || 0)
      })
      return cleanup
    }
  }, [])

  // Listen for download title updates
  useEffect(() => {
    if (window.electronAPI?.onDownloadTitle) {
      const cleanup = window.electronAPI.onDownloadTitle((title) => {
        setDownloadTitle(title)
        setShowNotification(true)
      })
      return cleanup
    }
  }, [])

  // Listen for lyrics progress updates
  useEffect(() => {
    const cleanup = window.electronAPI?.onLyricsProgress((progress) => {
      setLyricsProgress(progress)
      if (progress.percentage === 100) {
        setIsProcessingLyrics(false)
      }
    })
    return cleanup
  }, [])

  // Load scan statuses when music files change
  useEffect(() => {
    const loadScanStatuses = async () => {
      if (sortedMusicFiles.length === 0) {
        setScanStatuses({})
        return
      }

      try {
        const filePaths = sortedMusicFiles.map(f => f.path)
        const statuses = await window.electronAPI?.cacheGetBatchStatus(filePaths)
        if (statuses) {
          setScanStatuses(statuses)
        }
      } catch (error) {
        console.error('Failed to load scan statuses:', error)
      }
    }
    loadScanStatuses()
  }, [sortedMusicFiles])

  // Calculate unscanned files count
  const unscannedFiles = useMemo(() => {
    return sortedMusicFiles.filter(file => {
      const status = scanStatuses[file.path]
      // Files are unscanned if: no status loaded yet, status is 'unscanned', or file changed
      return !status || status === 'unscanned' || status === 'file-changed'
    })
  }, [sortedMusicFiles, scanStatuses])

  // Handle scan all unscanned songs
  const handleScanAll = useCallback(async () => {
    if (unscannedFiles.length === 0) {
      showToastNotification('All songs have already been scanned', 'info')
      return
    }

    console.log(`Starting batch scan of ${unscannedFiles.length} songs...`)
    await scanBatch(unscannedFiles)
  }, [unscannedFiles, scanBatch, showToastNotification])

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await window.electronAPI?.getSettings()
        if (settings) {
          setDownloadFolder(settings.downloadFolderPath)
          // If music folder is set in settings, use it
          if (settings.musicFolderPath && !selectedFolder) {
            await scanFolder(settings.musicFolderPath)
          }
        }
      } catch (error) {
        console.error('Failed to load settings:', error)
      }
    }
    loadSettings()
  }, [])

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      switch (e.key) {
        case ' ': // Space - Play/Pause
          e.preventDefault()
          togglePlayPause()
          break
        case 'ArrowRight': // Next track
          e.preventDefault()
          playNext()
          break
        case 'ArrowLeft': // Previous track
          e.preventDefault()
          playPrevious()
          break
        case 'ArrowUp': // Volume up
          e.preventDefault()
          setVolume(Math.min(1, volume + 0.05))
          break
        case 'ArrowDown': // Volume down
          e.preventDefault()
          setVolume(Math.max(0, volume - 0.05))
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [togglePlayPause, playNext, playPrevious, volume, setVolume])

  const handleSettingsChange = async () => {
    // Reload settings after save
    try {
      const settings = await window.electronAPI?.getSettings()
      if (settings) {
        setDownloadFolder(settings.downloadFolderPath)
        // If music folder changed, rescan
        if (settings.musicFolderPath && settings.musicFolderPath !== selectedFolder) {
          await scanFolder(settings.musicFolderPath)
        }
      }
    } catch (error) {
      console.error('Failed to reload settings:', error)
    }
  }

  const handleCancelDownload = useCallback(async () => {
    try {
      const canceled = await window.electronAPI.cancelYouTubeDownload()
      if (canceled) {
        showToastNotification('Download canceled', 'info')
        setIsDownloading(false)
        setShowNotification(false)
      }
    } catch (error) {
      console.error('Failed to cancel download:', error)
    }
  }, [showToastNotification])

  const handleDownload = async (url: string) => {
    const targetFolder = downloadFolder || selectedFolder
    if (!targetFolder) {
      showToastNotification('Please set a download folder in settings', 'warning')
      return
    }

    setIsDownloading(true)
    setDownloadProgress(0)
    setBinaryDownloadStatus('')
    setBinaryDownloadProgress(0)
    setShowNotification(true)
    setDownloadTitle('Loading title...')

    try {
      const result = await window.electronAPI?.downloadYouTube?.(url, targetFolder)

      if (result?.success) {
        console.log('Download completed:', result.filePath)
        // Refresh the music library if music folder is set
        if (selectedFolder) {
          await scanFolder(selectedFolder)
        }
        showToastNotification('Download completed!', 'success')
      } else {
        // Only show error if it wasn't a manual cancellation
        if (result?.error && !result.error.includes('SIGKILL') && !result.error.includes('killed')) {
          showToastNotification(`Download failed: ${result?.error || 'Unknown error'}`, 'error')
        }
      }
    } catch (error) {
      // Ignore errors from manual cancellation
      const errorMsg = String(error)
      if (!errorMsg.includes('SIGKILL') && !errorMsg.includes('killed')) {
        console.error('Download error:', error)
        showToastNotification(`Download error: ${error}`, 'error')
      }
    } finally {
      setIsDownloading(false)
      setDownloadProgress(0)
      setBinaryDownloadStatus('')
      setBinaryDownloadProgress(0)
      // Delay hiding notification for fade-out animation
      setTimeout(() => {
        setShowNotification(false)
      }, 2000)
    }
  }

  // Handle lyrics processing
  const handleProcessLyrics = useCallback(async (filePath: string, songName: string) => {
    // Open the panel and start processing
    setShowLyricsPanel(true)
    setLyricsSongName(songName)
    setLyricsText(null)
    setIsProcessingLyrics(true)
    setLyricsProgress({ step: 'Starting...', percentage: 0 })

    try {
      const result = await window.electronAPI.processLyrics(filePath)
      if (result.success && result.lyrics) {
        setLyricsText(result.lyrics)
      } else {
        showToastNotification(`Failed: ${result.message}`, 'error')
      }
    } catch (err) {
      console.error('Lyrics processing error:', err)
      showToastNotification('Failed to process lyrics', 'error')
    } finally {
      setIsProcessingLyrics(false)
    }
  }, [showToastNotification])

  return (
    <div className="app-container">
      {/* Sidebar is now full-height on the left */}
      <Sidebar
        selectedView={selectedView}
        onViewChange={(view) => {
          setSelectedView(view)
          // Clear active playlist when switching away from playlist view
          if (!view.startsWith('playlist:')) {
            clearActivePlaylist()
            setSelectedPlaylistId(null)
          }
        }}
        musicFiles={sortedMusicFiles}
        playlists={playlists}
        selectedPlaylistId={selectedPlaylistId}
        onPlaylistClick={(playlistId) => {
          setSelectedPlaylistId(playlistId)
          loadPlaylist(playlistId)
        }}
        onCreatePlaylist={() => {
          setPendingSongsForPlaylist([])
          setShowCreatePlaylistModal(true)
        }}
        onDeletePlaylist={deletePlaylist}
      />

      {/* Main content area (right side) */}
      <div className="app-main">
        <TitleBar />
        <div className="app-content">
          <div className="app-header">
            <div className="search-container" title="Search by title, artist, or album">
              <input
                type="text"
                className="search-input"
                placeholder="Search title, artist, album..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="header-actions">
              <button
                className="settings-button"
                onClick={() => setShowSettings(true)}
                aria-label="Settings"
                title="Settings"
              >
                <img src={settingsIcon} alt="Settings" className="settings-icon" />
              </button>
              <DownloadButton
                onDownload={handleDownload}
                isDownloading={isDownloading}
                progress={downloadProgress}
                binaryStatus={binaryDownloadStatus}
                binaryProgress={binaryDownloadProgress}
              />
            </div>
          </div>

          {error && <div className="error">{error}</div>}

          {loading && <div className="loading">Scanning music files...</div>}

          <div className="main-content">
            <div className="music-list-container">
              <OverlayScrollbarsComponent
                options={{
                  scrollbars: {
                    theme: 'os-theme-dark',
                    autoHide: 'move',
                    autoHideDelay: 800,
                  },
                }}
                className="music-list-scroll"
              >
                <SongList
                  songs={filteredMusicFiles}
                  onSongClick={(file) => {
                    // Find the actual index in the full library
                    const actualIndex = sortedMusicFiles.findIndex(f => f.path === file.path)
                    if (actualIndex !== -1) {
                      playSong(file, actualIndex)
                    }
                  }}
                  playingIndex={playingIndex !== null ? filteredMusicFiles.findIndex(f => f.path === sortedMusicFiles[playingIndex]?.path) : null}
                  sortBy={sortBy}
                  onSortChange={setSortBy}
                  onUpdateSingleFile={updateSingleFile}
                  onShowNotification={showToastNotification}
                  isPlaying={isPlaying}
                  onPlayPause={togglePlayPause}
                  playlists={playlists}
                  onAddToPlaylist={addSongsToPlaylist}
                  onCreatePlaylistWithSongs={(filePaths) => {
                    setPendingSongsForPlaylist(filePaths)
                    setShowCreatePlaylistModal(true)
                  }}
                  onProcessLyrics={handleProcessLyrics}
                />
              </OverlayScrollbarsComponent>
            </div>
          </div>
        </div>
      </div>

      <PlaybackBar
        currentSong={playingIndex !== null && playbackContext.songs[playingIndex] ? playbackContext.songs[playingIndex] : null}
        isPlaying={isPlaying}
        onPlayPause={togglePlayPause}
        onNext={playNext}
        onPrevious={playPrevious}
        shuffle={shuffle}
        repeatMode={repeatMode}
        onToggleShuffle={toggleShuffle}
        onCycleRepeatMode={cycleRepeatMode}
        currentTime={currentTime}
        duration={duration}
        onSeek={seek}
        volume={volume}
        onVolumeChange={setVolume}
        currentSound={currentSound}
        visualizerMode={visualizerMode}
        playbackContextName={playbackContext.name}
      />

      <DownloadNotification
        title={downloadTitle}
        progress={downloadProgress}
        isVisible={showNotification && isDownloading}
        onCancel={handleCancelDownload}
      />

      <NotificationToast
        message={toastMessage}
        type={toastType}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
      />

      <Settings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSettingsChange={handleSettingsChange}
        onScanAll={handleScanAll}
        isBatchScanning={batchProgress.isScanning}
        unscannedCount={unscannedFiles.length}
        totalSongCount={sortedMusicFiles.length}
        visualizerMode={visualizerMode}
        onVisualizerModeChange={setVisualizerMode}
      />

      <BatchScanProgress
        isVisible={batchProgress.isScanning}
        currentIndex={batchProgress.currentIndex}
        totalCount={batchProgress.totalCount}
        currentSongName={batchProgress.currentSongName}
        apiPhase={batchProgress.apiPhase}
        onCancel={cancelBatchScan}
      />

      <LyricsPanel
        isOpen={showLyricsPanel}
        onClose={() => setShowLyricsPanel(false)}
        songName={lyricsSongName}
        lyrics={lyricsText}
        progress={lyricsProgress}
        isProcessing={isProcessingLyrics}
      />

      <CreatePlaylistModal
        isOpen={showCreatePlaylistModal}
        onClose={() => {
          setShowCreatePlaylistModal(false)
          setPendingSongsForPlaylist([])
        }}
        onCreate={async (name, description) => {
          const playlist = await createPlaylist(name, description)
          if (playlist && pendingSongsForPlaylist.length > 0) {
            await addSongsToPlaylist(playlist.id, pendingSongsForPlaylist)
          }
          return playlist
        }}
      />
    </div>
  )
}

export default App
