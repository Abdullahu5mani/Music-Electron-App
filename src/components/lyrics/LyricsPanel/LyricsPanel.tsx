import { useEffect, useRef } from 'react'
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react'
import microphoneIcon from '../../../assets/icons/microphone.svg'
import speakerIcon from '../../../assets/icons/speaker.svg'
import robotIcon from '../../../assets/icons/robot.svg'
import checkIcon from '../../../assets/icons/check.svg'
import musicNoteIcon from '../../../assets/icons/music-note.svg'
import warningIcon from '../../../assets/icons/warning.svg'
import closeIcon from '../../../assets/icons/close.svg'
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
                <div className="lyrics-panel-header">
                    <div className="lyrics-panel-title">
                        <img src={microphoneIcon} alt="" className="lyrics-icon" />
                        <h2>Lyrics</h2>
                    </div>
                    <button className="lyrics-panel-close" onClick={onClose}>
                        <img src={closeIcon} alt="Close" className="close-icon" />
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
                                    <img src={progress.percentage >= 50 ? checkIcon : speakerIcon} alt="" className="stage-icon" />
                                    <span>Isolating Vocals</span>
                                </div>
                                <div className={`stage ${progress.percentage >= 50 ? 'active' : ''} ${progress.percentage >= 100 ? 'complete' : ''}`}>
                                    <img src={progress.percentage >= 100 ? checkIcon : robotIcon} alt="" className="stage-icon" />
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
                            <img src={musicNoteIcon} alt="" className="lyrics-empty-icon" />
                            <p>Click "Lyrics" on a song to generate lyrics</p>
                        </div>
                    )}
                </div>

                {/* Disclaimer */}
                <div className="lyrics-disclaimer">
                    <img src={warningIcon} alt="" className="disclaimer-icon" />
                    <span>AI-generated lyrics may not be 100% accurate</span>
                </div>
            </div>
        </div>
    )
}
