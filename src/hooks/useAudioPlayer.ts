import { useState, useEffect, useRef } from 'react'
import WaveSurfer from 'wavesurfer.js'
import type { MusicFile } from '../../electron/musicScanner'
import { pathToFileURL } from '../pathResolver'

type RepeatMode = 'off' | 'all' | 'one'

interface UseAudioPlayerReturn {
  playSong: (file: MusicFile, index: number) => void
  togglePlayPause: () => void
  playNext: () => void
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
  playingIndex: number | null
  analyserNode: AnalyserNode | null
}

/**
 * Custom hook for managing audio playback using WaveSurfer.js
 */
export function useAudioPlayer(
  musicFiles: MusicFile[],
  containerRef: React.RefObject<HTMLDivElement>
): UseAudioPlayerReturn {
  const [playingIndex, setPlayingIndex] = useState<number | null>(null)
  const [currentTime, setCurrentTime] = useState<number>(0)
  const [duration, setDuration] = useState<number>(0)
  const [volume, setVolumeState] = useState<number>(1.0)
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [shuffle, setShuffle] = useState<boolean>(false)
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off')

  const wavesurferRef = useRef<WaveSurfer | null>(null)
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null)

  const playNextRef = useRef<(auto?: boolean) => void>()
  const historyRef = useRef<number[]>([])
  const isReadyRef = useRef<boolean>(false)

  // Initialize WaveSurfer
  useEffect(() => {
    if (!containerRef.current) return

    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#646cff',
      progressColor: '#a1a6ff',
      cursorColor: '#fff',
      barWidth: 2,
      barGap: 3,
      height: 40,
      barRadius: 2,
      normalize: true,
      backend: 'MediaElement', // Changed to MediaElement to support file:// and avoiding strict CSP/CORS issues with WebAudio
    })

    wavesurferRef.current = wavesurfer

    // Events
    wavesurfer.on('ready', () => {
      isReadyRef.current = true
      setDuration(wavesurfer.getDuration())
      wavesurfer.play()
      setIsPlaying(true)

      // For MediaElement backend, we need to create a source from the media element
      try {
        const media = wavesurfer.getMediaElement()
        if (media) {
           // We need an AudioContext to create an analyser.
           // We can create one ourselves or reuse one if WaveSurfer exposes it (it might not for MediaElement).

           const AudioContext = window.AudioContext || (window as any).webkitAudioContext
           if (AudioContext) {
               const ac = new AudioContext()
               const source = ac.createMediaElementSource(media)
               const analyser = ac.createAnalyser()
               analyser.fftSize = 256

               source.connect(analyser)
               analyser.connect(ac.destination)

               setAnalyserNode(analyser)
           }
        }
      } catch (e) {
        console.error('Failed to setup visualizer', e)
      }
    })

    wavesurfer.on('audioprocess', (time) => {
      setCurrentTime(time)
    })

    // WaveSurfer v7 event might be different for seek
    wavesurfer.on('seeking', () => {
        // no-op or update state if needed
    })

    wavesurfer.on('finish', () => {
      setIsPlaying(false)
      if (playNextRef.current) {
        playNextRef.current(true)
      }
    })

    wavesurfer.on('play', () => setIsPlaying(true))
    wavesurfer.on('pause', () => setIsPlaying(false))

    // Cleanup
    return () => {
      wavesurfer.destroy()
      wavesurferRef.current = null
    }
  }, [containerRef.current])

  // Handle Play Song
  const playSong = (file: MusicFile, index: number) => {
    if (!wavesurferRef.current) return

    const fileURL = pathToFileURL(file.path)

    isReadyRef.current = false
    setPlayingIndex(index)
    historyRef.current.push(index)

    // Load audio
    wavesurferRef.current.load(fileURL)

    setVolume(volume)
  }

  // Handle Next/Prev
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

    if (auto && repeatMode === 'one') {
      playSong(musicFiles[playingIndex], playingIndex)
      return
    }

    if (shuffle) {
      const randomIndex = getRandomIndex(playingIndex, musicFiles.length)
      if (randomIndex !== null) playSong(musicFiles[randomIndex], randomIndex)
      return
    }

    const nextIndex = playingIndex + 1
    if (nextIndex < musicFiles.length) {
      playSong(musicFiles[nextIndex], nextIndex)
    } else if (repeatMode === 'all') {
      playSong(musicFiles[0], 0)
    }
  }

  const playPrevious = () => {
    if (musicFiles.length === 0 || playingIndex === null) return

    // If more than 3 seconds in, restart song
    if (currentTime > 3) {
      seek(0)
      return
    }

    const prevIndex = playingIndex - 1
    if (prevIndex >= 0) {
      playSong(musicFiles[prevIndex], prevIndex)
    } else if (repeatMode === 'all') {
      playSong(musicFiles[musicFiles.length - 1], musicFiles.length - 1)
    }
  }

  const togglePlayPause = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.playPause()
    }
  }

  const seek = (time: number) => {
    if (wavesurferRef.current && duration > 0) {
      const progress = time / duration
      wavesurferRef.current.seekTo(progress)
    }
  }

  const setVolume = (vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol))
    setVolumeState(clamped)
    if (wavesurferRef.current) {
      wavesurferRef.current.setVolume(clamped)
    }
  }

  const toggleShuffle = () => setShuffle(!shuffle)
  const cycleRepeatMode = () => setRepeatMode(prev => prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off')

  // Keep refs in sync
  useEffect(() => {
    playNextRef.current = playNext
  }, [playingIndex, musicFiles, shuffle, repeatMode])

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
       // WaveSurfer v7 handles resize automatically via ResizeObserver usually
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Media Session
  const currentSong = playingIndex !== null ? musicFiles[playingIndex] : null

  useEffect(() => {
    if ('mediaSession' in navigator && currentSong) {
      const metadata: MediaMetadataInit = {
        title: currentSong.metadata?.title || currentSong.name,
        artist: currentSong.metadata?.artist || 'Unknown Artist',
        album: currentSong.metadata?.album || 'Unknown Album',
      }
      if (currentSong.metadata?.albumArt) {
        metadata.artwork = [{ src: currentSong.metadata.albumArt, sizes: '512x512', type: 'image/jpeg' }] // Simplified type guess
      }
      navigator.mediaSession.metadata = new MediaMetadata(metadata)
    }
  }, [currentSong])

  useEffect(() => {
    if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused'
    }
  }, [isPlaying])

  useEffect(() => {
      if ('mediaSession' in navigator) {
          navigator.mediaSession.setActionHandler('play', togglePlayPause)
          navigator.mediaSession.setActionHandler('pause', togglePlayPause)
          navigator.mediaSession.setActionHandler('previoustrack', playPrevious)
          navigator.mediaSession.setActionHandler('nexttrack', () => playNext(false))
          navigator.mediaSession.setActionHandler('seekto', (d) => {
              if (d.seekTime) seek(d.seekTime)
          })
      }
      return () => {
          if ('mediaSession' in navigator) {
               navigator.mediaSession.setActionHandler('play', null)
               navigator.mediaSession.setActionHandler('pause', null)
               navigator.mediaSession.setActionHandler('previoustrack', null)
               navigator.mediaSession.setActionHandler('nexttrack', null)
               navigator.mediaSession.setActionHandler('seekto', null)
          }
      }
  }, [togglePlayPause, playPrevious, playNext, seek])


  return {
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
    playingIndex,
    analyserNode
  }
}
