import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAudioPlayer } from './useAudioPlayer'
import type { MusicFile } from '../../electron/musicScanner'

// Mock Howler to avoid real audio operations
vi.mock('howler', () => {
  class MockHowl {
    private _playing = false
    private _seek = 0
    private _duration = 180
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(public _opts: any) {}
    play() {
      this._playing = true
      return 1
    }
    pause() {
      this._playing = false
    }
    stop() {
      this._playing = false
    }
    unload() {}
    playing() {
      return this._playing
    }
    duration() {
      return this._duration
    }
    seek(val?: number) {
      if (typeof val === 'number') {
        this._seek = val
      }
      return this._seek
    }
    volume() {}
  }
  return { Howl: MockHowl }
})

const mockFiles: MusicFile[] = [
  {
    path: '/path/song1.mp3',
    name: 'song1.mp3',
    extension: '.mp3',
    size: 1000,
    metadata: { title: 'Song 1', artist: 'Artist 1', album: 'A' },
  },
  {
    path: '/path/song2.mp3',
    name: 'song2.mp3',
    extension: '.mp3',
    size: 1000,
    metadata: { title: 'Song 2', artist: 'Artist 2', album: 'B' },
  },
]

describe('useAudioPlayer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('cycles repeat modes off → all → one → off', () => {
    const { result } = renderHook(() => useAudioPlayer(mockFiles))
    expect(result.current.repeatMode).toBe('off')

    act(() => result.current.cycleRepeatMode())
    expect(result.current.repeatMode).toBe('all')

    act(() => result.current.cycleRepeatMode())
    expect(result.current.repeatMode).toBe('one')

    act(() => result.current.cycleRepeatMode())
    expect(result.current.repeatMode).toBe('off')
  })

  it('toggles shuffle on and off', () => {
    const { result } = renderHook(() => useAudioPlayer(mockFiles))
    expect(result.current.shuffle).toBe(false)
    act(() => result.current.toggleShuffle())
    expect(result.current.shuffle).toBe(true)
    act(() => result.current.toggleShuffle())
    expect(result.current.shuffle).toBe(false)
  })

  it('repeat-all wraps to first track on auto-advance', () => {
    const { result } = renderHook(() => useAudioPlayer(mockFiles))
    act(() => result.current.playSong(mockFiles[1], 1)) // play last track
    act(() => result.current.cycleRepeatMode()) // off -> all
    act(() => result.current.playNext(true)) // auto-advance
    expect(result.current.playingIndex).toBe(0)
  })

  it('repeat-one replays the same track on auto-advance', () => {
    const { result } = renderHook(() => useAudioPlayer(mockFiles))
    act(() => result.current.playSong(mockFiles[0], 0))
    act(() => {
      result.current.cycleRepeatMode() // all
      result.current.cycleRepeatMode() // one
    })
    act(() => result.current.playNext(true))
    expect(result.current.playingIndex).toBe(0)
  })

  it('shuffle picks a random different track', () => {
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0.8) // choose index 1
    const { result } = renderHook(() => useAudioPlayer(mockFiles))
    act(() => result.current.playSong(mockFiles[0], 0))
    act(() => result.current.toggleShuffle())
    act(() => result.current.playNext()) // manual next in shuffle
    expect(result.current.playingIndex).toBe(1)
    randSpy.mockRestore()
  })

  it('shuffle + previous uses history to go back', () => {
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0.8) // go to index 1
    const { result } = renderHook(() => useAudioPlayer(mockFiles))
    act(() => result.current.playSong(mockFiles[0], 0))
    act(() => result.current.toggleShuffle())
    act(() => result.current.playNext())
    expect(result.current.playingIndex).toBe(1)
    act(() => result.current.playPrevious())
    expect(result.current.playingIndex).toBe(0)
    randSpy.mockRestore()
  })
})

