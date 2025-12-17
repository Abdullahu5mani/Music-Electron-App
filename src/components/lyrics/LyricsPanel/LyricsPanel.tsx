import { useEffect, useRef } from 'react'
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react'
import './LyricsPanel.css'

interface LyricsPanelProps {
    isOpen: boolean
    onClose: () => void
    songName: string
    lyrics: string | null
    progress: { step: string; percentage: number } | null
    isProcessing: boolean
}

export function LyricsPanel({
    isOpen,
    onClose,
    songName,
    lyrics,
    progress,
    isProcessing
}: LyricsPanelProps) {
    const panelRef = useRef<HTMLDivElement>(null)

    // Close on escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose()
            }
        }
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown)
        }
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, onClose])

    return (
        <div className={`lyrics-panel-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}>
            <div
                ref={panelRef}
                className={`lyrics-panel ${isOpen ? 'open' : ''}`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="lyrics-panel-header">
                    <div className="lyrics-panel-title">
                        <span className="lyrics-icon">🎤</span>
                        <h2>Lyrics</h2>
                    </div>
                    <button className="lyrics-panel-close" onClick={onClose}>
                        ×
                    </button>
                </div>

                {/* Song name */}
                <div className="lyrics-song-name">
                    {songName || 'No song selected'}
                </div>

                {/* Content */}
                <div className="lyrics-panel-content">
                    {isProcessing && progress ? (
                        <div className="lyrics-processing">
                            <div className="lyrics-processing-step">
                                {progress.step}
                            </div>
                            <div className="lyrics-progress-bar">
                                <div
                                    className="lyrics-progress-fill"
                                    style={{ width: `${progress.percentage}%` }}
                                />
                            </div>
                            <div className="lyrics-processing-stages">
                                <div className={`stage ${progress.percentage >= 20 ? 'active' : ''} ${progress.percentage >= 50 ? 'complete' : ''}`}>
                                    <span className="stage-icon">{progress.percentage >= 50 ? '✓' : '🔊'}</span>
                                    <span>Isolating Vocals</span>
                                </div>
                                <div className={`stage ${progress.percentage >= 50 ? 'active' : ''} ${progress.percentage >= 100 ? 'complete' : ''}`}>
                                    <span className="stage-icon">{progress.percentage >= 100 ? '✓' : '🤖'}</span>
                                    <span>AI Transcription</span>
                                </div>
                            </div>
                        </div>
                    ) : lyrics ? (
                        <OverlayScrollbarsComponent
                            options={{
                                scrollbars: {
                                    theme: 'os-theme-dark',
                                    autoHide: 'move',
                                    autoHideDelay: 800,
                                },
                            }}
                            className="lyrics-scroll"
                        >
                            <div className="lyrics-text">
                                {lyrics}
                            </div>
                        </OverlayScrollbarsComponent>
                    ) : (
                        <div className="lyrics-empty">
                            <span className="lyrics-empty-icon">🎵</span>
                            <p>Click "Lyrics" on a song to generate lyrics</p>
                        </div>
                    )}
                </div>

                {/* Disclaimer */}
                <div className="lyrics-disclaimer">
                    <span className="disclaimer-icon">⚠️</span>
                    <span>AI-generated lyrics may not be 100% accurate</span>
                </div>
            </div>
        </div>
    )
}
