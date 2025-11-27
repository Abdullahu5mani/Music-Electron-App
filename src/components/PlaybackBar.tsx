import { useState, useEffect } from 'react'
import type { MusicFile } from '../../electron/musicScanner'
import Slider from 'rc-slider'
import 'rc-slider/assets/index.css'
import playButtonIcon from '../assets/playButton.svg'
import pauseButtonIcon from '../assets/pauseButton.svg'
import backwardButtonIcon from '../assets/backwardButton.svg'
import forwardButtonIcon from '../assets/forwardButton.svg'
import volumeControlIcon from '../assets/volumeControl.svg'

interface PlaybackBarProps {
  currentSong: MusicFile
  isPlaying: boolean
  onPlayPause: () => void
  onNext: () => void
  onPrevious: () => void
  currentTime: number
  duration: number
  onSeek: (time: number) => void
  volume: number
  onVolumeChange: (volume: number) => void
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

/**
 * Component for the fixed playback bar at the bottom
 */
export function PlaybackBar({
  currentSong,
  isPlaying,
  onPlayPause,
  onNext,
  onPrevious,
  currentTime,
  duration,
  onSeek,
  volume,
  onVolumeChange,
}: PlaybackBarProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragTime, setDragTime] = useState<number>(currentTime)

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

  return (
    <div className="playback-bar">
      <div className="playback-content">
        <div className="playback-album-art">
          {currentSong.metadata?.albumArt ? (
            <img 
              src={currentSong.metadata.albumArt} 
              alt="Album cover"
              className="playback-art"
            />
          ) : (
            <div className="playback-art-placeholder">🎵</div>
          )}
        </div>
        <div className="playback-info">
          <div className="playback-title">
            {currentSong.metadata?.title || currentSong.name}
          </div>
          <div className="playback-artist">
            {currentSong.metadata?.artist || 'Unknown Artist'}
          </div>
          <div className="seek-bar-container">
            <div className="seek-bar-wrapper">
              <Slider
                min={0}
                max={duration || 0}
                value={isDragging ? dragTime : currentTime}
                onChange={handleSeekChange}
                onAfterChange={handleSeekAfterChange}
                className="seek-bar-slider"
                trackStyle={{ backgroundColor: '#646cff', height: 8 }}
                handleStyle={{
                  borderColor: '#646cff',
                  backgroundColor: '#fff',
                  width: 16,
                  height: 16,
                  marginTop: -4,
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)',
                }}
                railStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', height: 8 }}
              />
            </div>
            <div className="time-display">
              <span>{formatTime(isDragging ? dragTime : currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>
        <div className="playback-controls">
          <button 
            className="control-button prev-button"
            onClick={(e) => {
              e.stopPropagation()
              onPrevious()
            }}
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
              trackStyle={{ backgroundColor: '#646cff', height: 6 }}
              handleStyle={{
                borderColor: '#646cff',
                backgroundColor: '#fff',
                width: 12,
                height: 12,
                marginTop: -3,
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
              }}
              railStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', height: 6 }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

