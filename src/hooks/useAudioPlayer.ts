import { useState, useEffect, useRef } from 'react'
import { Howl } from 'howler'
import type { MusicFile } from '../../electron/musicScanner'
import { pathToFileURL } from '../pathResolver'

interface UseAudioPlayerReturn {
  currentSound: Howl | null
  playingIndex: number | null
  playSong: (file: MusicFile, index: number) => void
  togglePlayPause: () => void
  playNext: () => void
  playPrevious: () => void
  isPlaying: boolean
  currentTime: number
  duration: number
  seek: (time: number) => void
  volume: number
  setVolume: (volume: number) => void
}

/**
 * Custom hook for managing audio playback
 */
export function useAudioPlayer(musicFiles: MusicFile[]): UseAudioPlayerReturn {
  const [currentSound, setCurrentSound] = useState<Howl | null>(null)
  const [playingIndex, setPlayingIndex] = useState<number | null>(null)
  const [currentTime, setCurrentTime] = useState<number>(0)
  const [duration, setDuration] = useState<number>(0)
  const [volume, setVolumeState] = useState<number>(1.0) // Volume range: 0.0 to 1.0
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isSeekingRef = useRef<boolean>(false)
  const playNextRef = useRef<() => void>()
  const playSongRef = useRef<(file: MusicFile, index: number) => void>()
  const currentFilePathRef = useRef<string | null>(null)

  const playSong = (file: MusicFile, index: number) => {
    // Ensure only one Howler instance exists - stop and cleanup current one
    if (currentSound) {
      currentSound.stop()
      currentSound.unload()
      setCurrentSound(null)
    }

    // Convert file path to file:// URL using path resolver
    const fileURL = pathToFileURL(file.path)

    // Get file extension without the dot for Howler format
    const format = file.extension.replace('.', '')

    // Create Howl instance
    const sound = new Howl({
      src: [fileURL],
      html5: true, // Required for file:// protocol in Electron
      format: [format], // Specify format (mp3, flac, wav, etc.)
      volume: volume, // Set initial volume
      onload: () => {
        // Get duration when sound is loaded
        const soundDuration = sound.duration()
        if (soundDuration && isFinite(soundDuration)) {
          setDuration(soundDuration)
        }
      },
      onend: () => {
        // Auto-play next song when current ends
        setIsPlaying(false)
        if (playNextRef.current) {
          playNextRef.current()
        }
      },
      onloaderror: () => {
        console.error('Error loading song')
        setPlayingIndex(null)
        setCurrentSound(null)
        setIsPlaying(false)
        currentFilePathRef.current = null
        setDuration(0)
        setCurrentTime(0)
      },
    })

    // Play the song
    sound.play()
    setCurrentSound(sound)
    setPlayingIndex(index)
    setIsPlaying(true)
    currentFilePathRef.current = file.path
    setCurrentTime(0)
    isSeekingRef.current = false
  }

  // Update playingIndex when musicFiles array changes (e.g., when sorting changes)
  // Find the current playing song by its path in the new array
  useEffect(() => {
    if (currentFilePathRef.current && playingIndex !== null) {
      const newIndex = musicFiles.findIndex(file => file.path === currentFilePathRef.current)
      if (newIndex !== -1 && newIndex !== playingIndex) {
        setPlayingIndex(newIndex)
      } else if (newIndex === -1) {
        // Current song not found in new array, stop playback
        if (currentSound) {
          currentSound.stop()
          currentSound.unload()
          setCurrentSound(null)
        }
        setPlayingIndex(null)
        currentFilePathRef.current = null
      }
    }
  }, [musicFiles])

  // Keep playSong ref in sync
  useEffect(() => {
    playSongRef.current = playSong
  }, [currentSound, musicFiles])

  const playNext = () => {
    if (musicFiles.length === 0 || playingIndex === null) return
    
    const nextIndex = playingIndex + 1
    if (nextIndex < musicFiles.length) {
      playSong(musicFiles[nextIndex], nextIndex)
    } else {
      // Wrap around to first song
      playSong(musicFiles[0], 0)
    }
  }

  // Keep playNext ref in sync
  useEffect(() => {
    playNextRef.current = playNext
  }, [musicFiles, playingIndex, currentSound])

  const togglePlayPause = () => {
    if (currentSound && playingIndex !== null) {
      if (currentSound.playing()) {
        currentSound.pause()
        setIsPlaying(false)
      } else {
        currentSound.play()
        setIsPlaying(true)
      }
    }
  }

  const playPrevious = () => {
    if (musicFiles.length === 0 || playingIndex === null) return
    
    const prevIndex = playingIndex - 1
    if (prevIndex >= 0) {
      playSong(musicFiles[prevIndex], prevIndex)
    } else {
      // Wrap around to last song
      playSong(musicFiles[musicFiles.length - 1], musicFiles.length - 1)
    }
  }

  const seek = (time: number) => {
    if (!currentSound) return
    
    // Clamp time to valid range
    const clampedTime = Math.max(0, Math.min(time, duration || 0))
    
    // Set seeking flag to prevent time updates
    isSeekingRef.current = true
    
    // Update UI immediately for responsiveness
    setCurrentTime(clampedTime)
    
    // Perform the seek operation
    try {
      currentSound.seek(clampedTime)
      // Reset seeking flag after a delay to allow seek to complete
      setTimeout(() => {
        isSeekingRef.current = false
      }, 200)
    } catch (error) {
      console.error('Error during seek:', error)
      isSeekingRef.current = false
    }
  }

  const setVolume = (newVolume: number) => {
    // Clamp volume to valid range (0.0 to 1.0)
    const clampedVolume = Math.max(0, Math.min(1, newVolume))
    setVolumeState(clampedVolume)
    
    // Update volume on current sound if it exists
    if (currentSound) {
      currentSound.volume(clampedVolume)
    }
  }

  // Update volume on current sound when volume state changes
  useEffect(() => {
    if (currentSound) {
      currentSound.volume(volume)
    }
  }, [volume, currentSound])

  // Update current time while playing
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    const playing = currentSound?.playing() ?? false

    // Don't update time while seeking to avoid conflicts
    if (currentSound && playing && !isSeekingRef.current) {
      intervalRef.current = setInterval(() => {
        // Double-check seeking flag inside interval
        if (currentSound && !isSeekingRef.current && currentSound.playing()) {
          try {
            const seekTime = currentSound.seek() as number
            if (typeof seekTime === 'number' && isFinite(seekTime)) {
              setCurrentTime(seekTime)
            }
            
            // Update duration if it's available and changed
            const soundDuration = currentSound.duration()
            if (soundDuration && soundDuration !== duration && isFinite(soundDuration)) {
              setDuration(soundDuration)
            }
            
            // Update isPlaying state
            const playingState = currentSound.playing()
            setIsPlaying(playingState)
          } catch (error) {
            // Ignore errors during normal playback updates
          }
        } else {
          // Sound stopped or paused
          if (currentSound && !currentSound.playing()) {
            setIsPlaying(false)
          }
        }
      }, 100) // Update every 100ms for smooth progress
    } else if (currentSound && !playing && !isSeekingRef.current) {
      // When paused, update time once to reflect the paused position
      try {
        const seekTime = currentSound.seek() as number
        if (typeof seekTime === 'number' && isFinite(seekTime)) {
          setCurrentTime(seekTime)
        }
        setIsPlaying(false)
      } catch (error) {
        // Ignore errors
      }
    } else if (!currentSound) {
      // No sound loaded
      setIsPlaying(false)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [currentSound, duration])

  // Cleanup on unmount - ensure only one instance
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      if (currentSound) {
        currentSound.stop()
        currentSound.unload()
      }
    }
  }, [currentSound])

  // Send playback state to main process for tray menu updates
  useEffect(() => {
    if (window.electronAPI?.sendPlaybackState) {
      window.electronAPI.sendPlaybackState(isPlaying)
    }
  }, [isPlaying])

  // Listen for tray play/pause commands
  useEffect(() => {
    if (window.electronAPI?.onTrayPlayPause) {
      const cleanup = window.electronAPI.onTrayPlayPause(() => {
        togglePlayPause()
      })
      return cleanup
    }
  }, [togglePlayPause])

  return {
    currentSound,
    playingIndex,
    playSong,
    togglePlayPause,
    playNext,
    playPrevious,
    isPlaying,
    currentTime,
    duration,
    seek,
    volume,
    setVolume,
  }
}

