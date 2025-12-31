import { useState, useEffect, useRef } from 'react'
import { Howl } from 'howler'
import type { MusicFile } from '../../electron/musicScanner'
import { pathToFileURL } from '../utils/pathResolver'

type RepeatMode = 'off' | 'all' | 'one'

interface UseAudioPlayerReturn {
  currentSound: Howl | null
  playingIndex: number | null
  playSong: (file: MusicFile, index: number) => void
  togglePlayPause: () => void
  playNext: (auto?: boolean) => void
  playPrevious: () => void
  shuffle: boolean
  repeatMode: RepeatMode
  toggleShuffle: () => void
  cycleRepeatMode: () => void
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
  const [shuffle, setShuffle] = useState<boolean>(false)
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off')
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isSeekingRef = useRef<boolean>(false)
  const playNextRef = useRef<(auto?: boolean) => void>()
  const playSongRef = useRef<(file: MusicFile, index: number, recordHistory?: boolean) => void>()
  const currentFilePathRef = useRef<string | null>(null)
  const historyRef = useRef<number[]>([])
  // Track switching state to prevent race conditions
  const switchIdRef = useRef<number>(0)
  const pendingSoundRef = useRef<Howl | null>(null)

  const recordHistory = (index: number) => {
    const history = historyRef.current
    if (history[history.length - 1] !== index) {
      history.push(index)
    }
  }

  const playSong = (file: MusicFile, index: number, record = true) => {
    // Increment switch ID to invalidate any pending operations
    const thisSwitchId = ++switchIdRef.current

    // Clean up any pending sound that hasn't started yet
    if (pendingSoundRef.current) {
      try {
        pendingSoundRef.current.stop()
        pendingSoundRef.current.unload()
      } catch (e) {
        // Ignore cleanup errors
      }
      pendingSoundRef.current = null
    }

    // Ensure only one Howler instance exists - stop and cleanup current one
    if (currentSound) {
      try {
        currentSound.stop()
        currentSound.unload()
      } catch (e) {
        // Ignore cleanup errors
      }
      setCurrentSound(null)
    }

    // Reset state immediately for UI responsiveness
    setCurrentTime(0)
    setDuration(0)
    isSeekingRef.current = false

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
        // Check if this is still the current switch operation
        if (switchIdRef.current !== thisSwitchId) {
          // A newer track was requested, abandon this one
          try {
            sound.stop()
            sound.unload()
          } catch (e) {
            // Ignore
          }
          return
        }

        // Get duration when sound is loaded
        const soundDuration = sound.duration()
        if (soundDuration && isFinite(soundDuration)) {
          setDuration(soundDuration)
        }
        pendingSoundRef.current = null
      },
      onplay: () => {
        // Verify this is still the current track
        if (switchIdRef.current !== thisSwitchId) {
          try {
            sound.stop()
            sound.unload()
          } catch (e) {
            // Ignore
          }
          return
        }
      },
      onend: () => {
        // Only trigger next if this is still the current track
        if (switchIdRef.current === thisSwitchId) {
          setIsPlaying(false)
          if (playNextRef.current) {
            playNextRef.current(true)
          }
        }
      },
      onloaderror: () => {
        // Only handle error if this is still the current track
        if (switchIdRef.current === thisSwitchId) {
          console.error('Error loading song')
          setPlayingIndex(null)
          setCurrentSound(null)
          setIsPlaying(false)
          currentFilePathRef.current = null
          setDuration(0)
          setCurrentTime(0)
        }
        pendingSoundRef.current = null
      },
    })

    // Track as pending until loaded
    pendingSoundRef.current = sound

    // Play the song
    sound.play()
    setCurrentSound(sound)
    setPlayingIndex(index)
    if (record) {
      recordHistory(index)
    }
    setIsPlaying(true)
    currentFilePathRef.current = file.path
  }

  // Update playingIndex when musicFiles array changes (e.g., when sorting changes)
  // Find the current playing song by its path in the new array
  useEffect(() => {
    if (currentFilePathRef.current && playingIndex !== null) {
      // Robust matching: Try exact match first, then normalized path, then fuzzy match
      const normalizePath = (p: string) => p.toLowerCase().replace(/[\\/]+/g, '/')

      const currentPath = currentFilePathRef.current
      const normalizedCurrentPath = normalizePath(currentPath)

      let newIndex = musicFiles.findIndex(file => file.path === currentPath)

      // If exact path match fails, try normalized path
      if (newIndex === -1) {
        newIndex = musicFiles.findIndex(file => normalizePath(file.path) === normalizedCurrentPath)
      }

      // If that fails, try matching by Just Filename (very strong indicator)
      if (newIndex === -1) {
        // Find by name matching is often safer across different data sources (db vs scanner)
        const currentName = currentPath.split(/[\\/]/).pop()
        if (currentName) {
          newIndex = musicFiles.findIndex(file => {
            const fileName = file.path.split(/[\\/]/).pop()
            return fileName === currentName
          })
        }
      }

      if (newIndex !== -1 && newIndex !== playingIndex) {
        setPlayingIndex(newIndex)
      } else if (newIndex === -1) {
        // Still not found? Log it but don't stop playback. 
        console.warn('[AudioPlayer] Could not find current song in new context:', currentPath)
      }
    }
  }, [musicFiles])

  // Keep playSong ref in sync
  useEffect(() => {
    playSongRef.current = playSong
  }, [currentSound, musicFiles])

  const getRandomIndex = (excludeIndex: number | null, max: number): number | null => {
    if (max <= 0) return null
    if (max === 1) return excludeIndex ?? 0
    let candidate = excludeIndex
    while (candidate === excludeIndex) {
      candidate = Math.floor(Math.random() * max)
    }
    return candidate
  }

  const playNext = (auto = false) => {
    if (musicFiles.length === 0) return

    if (playingIndex === null) {
      playSong(musicFiles[0], 0)
      return
    }

    // Repeat one: replay same track when auto-advancing
    if (auto && repeatMode === 'one') {
      playSong(musicFiles[playingIndex], playingIndex)
      return
    }

    if (shuffle) {
      const randomIndex = getRandomIndex(playingIndex, musicFiles.length)
      if (randomIndex !== null) {
        playSong(musicFiles[randomIndex], randomIndex)
      }
      return
    }

    const nextIndex = playingIndex + 1
    if (nextIndex < musicFiles.length) {
      playSong(musicFiles[nextIndex], nextIndex)
    } else if (repeatMode === 'all') {
      playSong(musicFiles[0], 0)
    } else {
      setIsPlaying(false)
    }
  }

  // Keep playNext ref in sync
  useEffect(() => {
    playNextRef.current = playNext
  }, [musicFiles, playingIndex, currentSound, shuffle, repeatMode])

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

    if (shuffle && historyRef.current.length > 1) {
      historyRef.current.pop()
      const previousIndex = historyRef.current[historyRef.current.length - 1]
      if (previousIndex !== undefined && musicFiles[previousIndex]) {
        playSong(musicFiles[previousIndex], previousIndex, false)
        return
      }
    }

    const prevIndex = playingIndex - 1
    if (prevIndex >= 0) {
      playSong(musicFiles[prevIndex], prevIndex)
    } else if (repeatMode === 'all' && musicFiles.length > 0) {
      playSong(musicFiles[musicFiles.length - 1], musicFiles.length - 1)
    }
  }

  const toggleShuffle = () => {
    setShuffle((prev) => {
      const next = !prev
      if (playingIndex !== null) {
        historyRef.current = [playingIndex]
      } else {
        historyRef.current = []
      }
      return next
    })
  }

  const cycleRepeatMode = () => {
    setRepeatMode((prev) => {
      if (prev === 'off') return 'all'
      if (prev === 'all') return 'one'
      return 'off'
    })
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

  // Get current song for Media Session
  const currentSong = playingIndex !== null ? musicFiles[playingIndex] : null

  // Update Media Session metadata when song changes
  useEffect(() => {
    if ('mediaSession' in navigator && currentSong) {
      const metadata: MediaMetadataInit = {
        title: currentSong.metadata?.title || currentSong.name,
        artist: currentSong.metadata?.artist || 'Unknown Artist',
        album: currentSong.metadata?.album || 'Unknown Album',
      }

      // Add album art if available
      if (currentSong.metadata?.albumArt) {
        metadata.artwork = [
          {
            src: currentSong.metadata.albumArt,
            sizes: '512x512',
            type: currentSong.metadata.albumArt.startsWith('data:image/')
              ? currentSong.metadata.albumArt.split(';')[0].split(':')[1]
              : 'image/jpeg'
          }
        ]
      }

      navigator.mediaSession.metadata = new MediaMetadata(metadata)
    } else if ('mediaSession' in navigator && !currentSong) {
      // Clear metadata when no song is playing
      navigator.mediaSession.metadata = null
    }
  }, [currentSong])

  // Update Media Session playback state
  useEffect(() => {
    if ('mediaSession' in navigator) {
      if (currentSong) {
        navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused'
      } else {
        navigator.mediaSession.playbackState = 'none'
      }
    }
  }, [isPlaying, currentSong])

  // Update Media Session position state (for progress bar)
  // Update when playing or when seeking (to show paused position)
  useEffect(() => {
    if ('mediaSession' in navigator && currentSound && currentSong && duration > 0) {
      try {
        navigator.mediaSession.setPositionState({
          duration: duration,
          playbackRate: isPlaying ? 1.0 : 0.0,
          position: currentTime
        })
      } catch (error) {
        // Some browsers may not support setPositionState
        // Ignore errors silently
      }
    }
  }, [currentTime, duration, currentSound, currentSong, isPlaying])

  // Set up Media Session action handlers
  useEffect(() => {
    if ('mediaSession' in navigator) {
      // Play action
      navigator.mediaSession.setActionHandler('play', () => {
        togglePlayPause()
      })

      // Pause action
      navigator.mediaSession.setActionHandler('pause', () => {
        togglePlayPause()
      })

      // Previous track action
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        playPrevious()
      })

      // Next track action
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        playNext()
      })

      // Seek to action (for seeking via media controls)
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined && currentSound) {
          seek(details.seekTime)
        }
      })

      // Cleanup: remove handlers when component unmounts or when handlers change
      return () => {
        if ('mediaSession' in navigator) {
          navigator.mediaSession.setActionHandler('play', null)
          navigator.mediaSession.setActionHandler('pause', null)
          navigator.mediaSession.setActionHandler('previoustrack', null)
          navigator.mediaSession.setActionHandler('nexttrack', null)
          navigator.mediaSession.setActionHandler('seekto', null)
        }
      }
    }
  }, [togglePlayPause, playPrevious, playNext, seek, currentSound])

  return {
    currentSound,
    playingIndex,
    playSong,
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
  }
}

