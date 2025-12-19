import { useState, useEffect } from 'react'
import type { MusicFile } from '../../../../electron/musicScanner'
import Slider from 'rc-slider'
import 'rc-slider/assets/index.css'
import playButtonIcon from '../../../assets/playButton.svg'
import pauseButtonIcon from '../../../assets/pauseButton.svg'
import backwardButtonIcon from '../../../assets/backwardButton.svg'
import forwardButtonIcon from '../../../assets/forwardButton.svg'
import volumeControlIcon from '../../../assets/volumeControl.svg'
import trayIcon from '../../../assets/trayIcon.svg'
import { extractColorsFromImage, type ExtractedColors } from '../../../utils/colorExtractor'
import { AudioVisualizer, type VisualizerMode } from '../../common/AudioVisualizer/AudioVisualizer'
import type { Howl } from 'howler'

interface PlaybackBarProps {
  currentSong: MusicFile | null
  isPlaying: boolean
  onPlayPause: () => void
  onNext: () => void
  onPrevious: () => void
  shuffle: boolean
  repeatMode: 'off' | 'all' | 'one'
  onToggleShuffle: () => void
  onCycleRepeatMode: () => void
  currentTime: number
  duration: number
  onSeek: (time: number) => void
  volume: number
  onVolumeChange: (volume: number) => void
  currentSound?: Howl | null
  visualizerMode: VisualizerMode
  playbackContextName?: string  // e.g., "My Favorites" playlist name
}

/**
 * Formats seconds to MM:SS format
 */
function formatTime(seconds: number): string {
  if (isNaN(seconds) || !isFinite(seconds) || seconds < 0) {
    return '0:00'
  }
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Default colors when no album art
const defaultColors: ExtractedColors = {
  primary: '#667eea',
  secondary: '#764ba2',
  accent: '#f093fb',
  background: '#1a1a2e',
}

/**
 * Component for the fixed playback bar at the bottom
 */
export function PlaybackBar({
  currentSong,
  isPlaying,
  onPlayPause,
  onNext,
  onPrevious,
  shuffle,
  repeatMode,
  onToggleShuffle,
  onCycleRepeatMode,
  currentTime,
  duration,
  onSeek,
  volume,
  onVolumeChange,
  currentSound,
  visualizerMode,
  playbackContextName,
}: PlaybackBarProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragTime, setDragTime] = useState<number>(currentTime)
  const [glowColors, setGlowColors] = useState<ExtractedColors>(defaultColors)

  // Extract colors from album art when song changes
  useEffect(() => {
    const albumArt = currentSong?.metadata?.albumArt
    if (albumArt) {
      extractColorsFromImage(albumArt).then(setGlowColors)
    } else {
      setGlowColors(defaultColors)
    }
  }, [currentSong?.metadata?.albumArt])

  // Update dragTime when currentTime changes (but not while dragging)
  useEffect(() => {
    if (!isDragging) {
      setDragTime(currentTime)
    }
  }, [currentTime, isDragging])

  // Handle value change during drag (for visual feedback only)
  const handleSeekChange = (value: number | number[]) => {
    const newTime = Array.isArray(value) ? value[0] : value
    setDragTime(newTime)
    setIsDragging(true)
  }

  // Handle final seek when drag ends
  const handleSeekAfterChange = (value: number | number[]) => {
    const newTime = Array.isArray(value) ? value[0] : value
    setIsDragging(false)
    onSeek(newTime)
  }

  const repeatIcon = repeatMode === 'one' ? '🔂' : repeatMode === 'all' ? '🔁' : '↻'
  const repeatLabel = repeatMode === 'one' ? 'Repeat 1' : repeatMode === 'all' ? 'Repeat All' : 'Repeat Off'

  return (
    <div className="playback-bar">
      <div className="playback-content">
        <div className={`playback-album-art-wrapper ${isPlaying ? 'playing' : ''}`}>
          <div
            className="glow-border"
            style={{
              background: `conic-gradient(
                from 0deg,
                ${glowColors.primary},
                ${glowColors.secondary},
                ${glowColors.accent},
                ${glowColors.primary}
              )`
            }}
          ></div>
          <div className="playback-album-art">
            {currentSong?.metadata?.albumArt ? (
              <img
                src={currentSong.metadata.albumArt}
                alt="Album cover"
                className="playback-art"
              />
            ) : (
              <img
                src={trayIcon}
                alt="No song playing"
                className="playback-art-placeholder"
              />
            )}
          </div>
        </div>
        <div className="playback-info">
          <div className="playback-title">
            {currentSong ? (currentSong.metadata?.title || currentSong.name) : 'No song selected'}
          </div>
          <div className="playback-artist">
            {currentSong ? (currentSong.metadata?.artist || 'Unknown Artist') : 'Select a song to play'}
            {currentSong?.metadata?.album && (
              <span className="playback-album"> • {currentSong.metadata.album}</span>
            )}
          </div>
          {currentSong && playbackContextName && playbackContextName !== 'All Songs' && (
            <div className="playback-context">
              Playing from: {playbackContextName}
            </div>
          )}
        </div>
        <div className="seek-bar-container">
          {/* Audio Visualizer behind the seek bar */}
          {isPlaying && currentSound && (
            <AudioVisualizer
              mode={visualizerMode}
              colors={{
                primary: glowColors.primary,
                secondary: glowColors.secondary
              }}
              howl={currentSound}
            />
          )}
          <div className="seek-bar-wrapper">
            <Slider
              min={0}
              max={duration || 0}
              value={isDragging ? dragTime : currentTime}
              onChange={handleSeekChange}
              onChangeComplete={handleSeekAfterChange}
              className="seek-bar-slider"
              disabled={!currentSong}
              trackStyle={{ height: 4 }}
              handleStyle={{
                width: 14,
                height: 14,
                marginTop: -5,
              }}
              railStyle={{ height: 4 }}
            />
          </div>
          <div
            className="time-display"
          >
            <span>{formatTime(isDragging ? dragTime : currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
      <div className="playback-controls">
        <button
          className={`control-button toggle-button ${shuffle ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            onToggleShuffle()
          }}
          aria-label="Toggle shuffle"
          title={shuffle ? 'Shuffle On' : 'Shuffle Off'}
        >
          <span className="toggle-icon">🔀</span>
        </button>
        <button
          className={`control-button toggle-button ${repeatMode !== 'off' ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            onCycleRepeatMode()
          }}
          aria-label={`Cycle repeat mode (${repeatLabel})`}
          title={repeatLabel}
        >
          <span className="toggle-icon">{repeatIcon}</span>
        </button>
        <button
          className="control-button prev-button"
          onClick={(e) => {
            e.stopPropagation()
            onPrevious()
          }}
          disabled={!currentSong}
          aria-label="Previous"
        >
          <img src={backwardButtonIcon} alt="Previous" className="control-icon" />
        </button>
        <button
          className="control-button play-pause-button"
          onClick={(e) => {
            e.stopPropagation()
            onPlayPause()
          }}
          disabled={!currentSong}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <img src={pauseButtonIcon} alt="Pause" className="control-icon" />
          ) : (
            <img src={playButtonIcon} alt="Play" className="control-icon" />
          )}
        </button>
        <button
          className="control-button next-button"
          onClick={(e) => {
            e.stopPropagation()
            onNext()
          }}
          disabled={!currentSong}
          aria-label="Next"
        >
          <img src={forwardButtonIcon} alt="Next" className="control-icon" />
        </button>
        <div className="volume-control">
          <img src={volumeControlIcon} alt="Volume" className="volume-icon" />
          <Slider
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(value) => onVolumeChange(Array.isArray(value) ? value[0] : value)}
            className="volume-slider"
            trackStyle={{ height: 3 }}
            handleStyle={{
              width: 10,
              height: 10,
              marginTop: -3.5,
            }}
            railStyle={{ height: 3 }}
          />
        </div>
      </div>
    </div>
  )
}

