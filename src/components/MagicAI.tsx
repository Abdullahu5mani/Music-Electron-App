import React, { useState, useEffect, useRef } from 'react'
import type { MusicFile } from '../../electron/musicScanner'
import './MagicAI.css'

interface MagicAIProps {
  currentSong: MusicFile | null
  currentTime: number
  onSourceChange: (source: 'original' | 'vocals' | 'instrumental', path: string) => void
}

interface AnalysisResult {
  status: 'success' | 'error'
  original?: string
  vocals?: string
  accompaniment?: string
  lyrics?: string
  message?: string
}

interface LyricLine {
  time: number
  text: string
}

export const MagicAI: React.FC<MagicAIProps> = ({ currentSong, currentTime, onSourceChange }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [parsedLyrics, setParsedLyrics] = useState<LyricLine[]>([])
  const [activeSource, setActiveSource] = useState<'original' | 'vocals' | 'instrumental'>('original')
  const [currentLyricIndex, setCurrentLyricIndex] = useState(-1)
  const lyricsContainerRef = useRef<HTMLDivElement>(null)

  // Parse LRC lyrics
  const parseLRC = (lrc: string): LyricLine[] => {
    const lines = lrc.split('\n')
    const parsed: LyricLine[] = []
    const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2})\]/

    for (const line of lines) {
      const match = line.match(timeRegex)
      if (match) {
        const minutes = parseInt(match[1])
        const seconds = parseInt(match[2])
        const hundredths = parseInt(match[3])
        const time = minutes * 60 + seconds + hundredths / 100
        const text = line.replace(timeRegex, '').trim()
        parsed.push({ time, text })
      }
    }
    return parsed
  }

  // Handle Analyze
  const handleAnalyze = async () => {
    if (!currentSong) return

    setLoading(true)
    setResult(null)
    setParsedLyrics([])
    setActiveSource('original')

    try {
      // @ts-ignore - electronAPI is defined in preload
      const data = await window.electronAPI.analyzeTrack(currentSong.path)

      if (data.status === 'success') {
        setResult(data)
        if (data.lyrics) {
          setParsedLyrics(parseLRC(data.lyrics))
        }
      } else {
        console.error('Analysis failed:', data.message)
        // Show error (could add a toast here)
      }
    } catch (err) {
      console.error('Error calling analyzeTrack:', err)
    } finally {
      setLoading(false)
    }
  }

  // Toggle Source
  const handleSourceToggle = (source: 'original' | 'vocals' | 'instrumental') => {
    if (!result || !currentSong) return

    let path = currentSong.path // Default to original

    if (source === 'vocals' && result.vocals) {
      path = result.vocals
    } else if (source === 'instrumental' && result.accompaniment) {
      path = result.accompaniment
    }

    // Since the paths returned by python might be absolute paths on disk,
    // we need to make sure the audio player can play them.
    // The existing player likely handles file:// paths or local paths.
    // However, the `onSourceChange` prop implies we're telling the parent to switch the audio source.

    // We need to pass the file path in a way the player understands.
    // If the player expects a MusicFile object, we might need to fake it or just pass the path
    // if the player supports direct path playing.
    // Looking at `useAudioPlayer`, it takes a list of `sortedMusicFiles`.
    // It uses `howler` probably or HTML5 audio.

    // For this component, I'll assume `onSourceChange` handles the logic of telling the player "play this file now at current time".

    onSourceChange(source, path)
    setActiveSource(source)
  }

  // Sync Lyrics
  useEffect(() => {
    if (!parsedLyrics.length) return

    // Find current lyric line based on prop `currentTime`
    let index = -1
    // We want the last line that started before or at currentTime
    for (let i = 0; i < parsedLyrics.length; i++) {
      if (parsedLyrics[i].time <= currentTime) {
        index = i
      } else {
        break
      }
    }

    if (index !== currentLyricIndex) {
      setCurrentLyricIndex(index)

      // Scroll to active lyric
      if (lyricsContainerRef.current) {
         const activeElement = lyricsContainerRef.current.children[index] as HTMLElement
         if (activeElement) {
           activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
         }
      }
    }
  }, [parsedLyrics, currentTime, currentLyricIndex])

  // Reset when song changes
  useEffect(() => {
    setResult(null)
    setParsedLyrics([])
    setIsOpen(false)
    setActiveSource('original')
  }, [currentSong])

  if (!currentSong) return null

  return (
    <div className={`magic-ai-container ${isOpen ? 'open' : ''}`}>
      {!isOpen && (
        <button className="magic-ai-btn" onClick={() => setIsOpen(true)} title="Magic AI">
          ✨
        </button>
      )}

      {isOpen && (
        <div className="magic-ai-panel">
          <div className="magic-ai-header">
            <h3>Magic AI Studio</h3>
            <button className="close-btn" onClick={() => setIsOpen(false)}>×</button>
          </div>

          {!result && !loading && (
             <div className="magic-ai-start">
               <p>Isolate vocals and generate lyrics with AI.</p>
               <button onClick={handleAnalyze}>Start Magic Analysis</button>
             </div>
          )}

          {loading && (
            <div className="magic-ai-loading">
              <div className="spinner"></div>
              <p>Isolating Vocals & Transcribing...</p>
              <small>This may take a minute.</small>
            </div>
          )}

          {result && (
            <div className="magic-ai-content">
              <div className="stem-controls">
                <button
                  className={activeSource === 'original' ? 'active' : ''}
                  onClick={() => handleSourceToggle('original')}
                >
                  Original
                </button>
                <button
                  className={activeSource === 'vocals' ? 'active' : ''}
                  onClick={() => handleSourceToggle('vocals')}
                  disabled={!result.vocals}
                >
                  Vocals Only
                </button>
                <button
                  className={activeSource === 'instrumental' ? 'active' : ''}
                  onClick={() => handleSourceToggle('instrumental')}
                  disabled={!result.accompaniment}
                >
                  Instrumental
                </button>
              </div>

              <div className="lyrics-display" ref={lyricsContainerRef}>
                {parsedLyrics.length > 0 ? (
                  parsedLyrics.map((line, i) => (
                    <p key={i} className={i === currentLyricIndex ? 'active' : ''}>
                      {line.text}
                    </p>
                  ))
                ) : (
                  <p className="no-lyrics">No lyrics found.</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
