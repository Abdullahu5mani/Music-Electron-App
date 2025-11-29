import { useState, useEffect, useMemo } from 'react'
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react'
import { useMusicLibrary } from './hooks/useMusicLibrary'
import { useAudioPlayer } from './hooks/useAudioPlayer'
import { SongList } from './components/SongList'
import { PlaybackBar } from './components/PlaybackBar'
import { TitleBar } from './components/TitleBar'
import { DownloadButton } from './components/DownloadButton'
import { DownloadNotification } from './components/DownloadNotification'
import { NotificationToast } from './components/NotificationToast'
import { Sidebar } from './components/Sidebar'
import type { MusicFile } from '../electron/musicScanner'
import './App.css'

function App() {
  const { sortedMusicFiles, loading, error, selectedFolder, handleSelectFolder, scanFolder, sortBy, setSortBy } = useMusicLibrary()
  const [selectedView, setSelectedView] = useState<string>('all')
  
  // Filter music files based on selected view
  const filteredMusicFiles = useMemo(() => {
    if (selectedView === 'all') {
      return sortedMusicFiles
    }
    
    if (selectedView.startsWith('artist:')) {
      const artist = selectedView.replace('artist:', '')
      return sortedMusicFiles.filter(file => file.metadata?.artist === artist)
    }
    
    if (selectedView.startsWith('album:')) {
      const album = selectedView.replace('album:', '')
      return sortedMusicFiles.filter(file => file.metadata?.album === album)
    }
    
    return sortedMusicFiles
  }, [sortedMusicFiles, selectedView])
  
  const { playingIndex, playSong, togglePlayPause, playNext, playPrevious, isPlaying, currentTime, duration, seek, volume, setVolume } = useAudioPlayer(filteredMusicFiles)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [binaryDownloadStatus, setBinaryDownloadStatus] = useState<string>('')
  const [binaryDownloadProgress, setBinaryDownloadProgress] = useState(0)
  const [downloadTitle, setDownloadTitle] = useState<string>('')
  const [showNotification, setShowNotification] = useState(false)
  const [toastMessage, setToastMessage] = useState<string>('')
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('info')
  const [showToast, setShowToast] = useState(false)

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

  // Helper function to show toast
  const showToastNotification = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setToastMessage(message)
    setToastType(type)
    setShowToast(true)
  }

  const handleDownload = async (url: string) => {
    if (!selectedFolder) {
      showToastNotification('Please select a music folder first', 'warning')
      return
    }

    setIsDownloading(true)
    setDownloadProgress(0)
    setBinaryDownloadStatus('')
    setBinaryDownloadProgress(0)
    setShowNotification(true)
    setDownloadTitle('Loading title...')

    try {
      const result = await window.electronAPI?.downloadYouTube?.(url, selectedFolder)
      
      if (result?.success) {
        console.log('Download completed:', result.filePath)
        // Refresh the music library to include the new file
        await scanFolder(selectedFolder)
        showToastNotification('Download completed!', 'success')
      } else {
        showToastNotification(`Download failed: ${result?.error || 'Unknown error'}`, 'error')
      }
    } catch (error) {
      console.error('Download error:', error)
      showToastNotification(`Download error: ${error}`, 'error')
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

  return (
    <div className="app-container">
      <TitleBar />
      <div className="app-content">
        <div className="app-header">
          <h1>Music Sync App</h1>
          <div className="header-actions">
            <button 
              className="folder-select-button"
              onClick={handleSelectFolder} 
              disabled={loading}
            >
              {loading ? 'Scanning...' : 'Select Music Folder'}
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
        
        {selectedFolder && (
          <p className="folder-path">Folder: {selectedFolder}</p>
        )}

        {error && <div className="error">{error}</div>}

        {loading && <div className="loading">Scanning music files...</div>}

        <div className="main-content">
          <Sidebar 
            selectedView={selectedView}
            onViewChange={setSelectedView}
            musicFiles={sortedMusicFiles}
          />
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
                onSongClick={playSong} 
                playingIndex={playingIndex}
                sortBy={sortBy}
                onSortChange={setSortBy}
              />
            </OverlayScrollbarsComponent>
          </div>
        </div>
      </div>

      <PlaybackBar
        currentSong={playingIndex !== null && filteredMusicFiles[playingIndex] ? filteredMusicFiles[playingIndex] : null}
        isPlaying={isPlaying}
        onPlayPause={togglePlayPause}
        onNext={playNext}
        onPrevious={playPrevious}
        currentTime={currentTime}
        duration={duration}
        onSeek={seek}
        volume={volume}
        onVolumeChange={setVolume}
      />

      <DownloadNotification
        title={downloadTitle}
        progress={downloadProgress}
        isVisible={showNotification && isDownloading}
      />

      <NotificationToast
        message={toastMessage}
        type={toastType}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
      />
    </div>
  )
}

export default App
