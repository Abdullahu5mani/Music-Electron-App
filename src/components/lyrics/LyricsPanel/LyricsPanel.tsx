import { useEffect, useRef, useMemo } from 'react'
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react'
import microphoneIcon from '../../../assets/icons/microphone.svg'
import speakerIcon from '../../../assets/icons/speaker.svg'
import robotIcon from '../../../assets/icons/robot.svg'
import checkIcon from '../../../assets/icons/check.svg'
import musicNoteIcon from '../../../assets/icons/music-note.svg'
import warningIcon from '../../../assets/icons/warning.svg'
import closeIcon from '../../../assets/icons/close.svg'
import './LyricsPanel.css'

interface LyricsSegment {
    start: number
    end: number
    text: string
}

interface LyricsPanelProps {
    isOpen: boolean
    onClose: () => void
    songName: string
    lyrics: string | null
    segments: LyricsSegment[]
    currentTime: number
    progress: { step: string; percentage: number } | null
    isProcessing: boolean
}

export function LyricsPanel({
    isOpen,
    onClose,
    songName,
    lyrics,
    segments,
    currentTime,
    progress,
    isProcessing
}: LyricsPanelProps) {
    const panelRef = useRef<HTMLDivElement>(null)
    const activeLineRef = useRef<HTMLDivElement>(null)
    const scrollContainerRef = useRef<HTMLDivElement>(null)
    const hasInitiallyScrolled = useRef(false)

    // Find the current active segment index based on currentTime
    const activeSegmentIndex = useMemo(() => {
        if (!segments || segments.length === 0) return -1

        // Find the segment where currentTime falls within [start, end]
        for (let i = 0; i < segments.length; i++) {
            if (currentTime >= segments[i].start && currentTime < segments[i].end) {
                return i
            }
        }

        // If between segments, find the next upcoming segment
        for (let i = 0; i < segments.length; i++) {
            if (currentTime < segments[i].start) {
                // Highlight the upcoming segment if we're close (within 2 seconds)
                if (segments[i].start - currentTime < 2) {
                    return i
                }
                return i > 0 ? i - 1 : -1
            }
        }

        // If we're past all segments, keep the last one highlighted
        if (segments.length > 0 && currentTime >= segments[segments.length - 1].end) {
            return segments.length - 1
        }

        // If we're before the first segment, don't highlight anything
        return -1
    }, [segments, currentTime])

    // Reset initial scroll flag when segments change (new lyrics loaded)
    useEffect(() => {
        if (segments && segments.length > 0) {
            hasInitiallyScrolled.current = false
        }
    }, [segments])

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

    // Auto-scroll to keep active line visible
    useEffect(() => {
        if (activeLineRef.current && scrollContainerRef.current && activeSegmentIndex >= 0) {
            const container = scrollContainerRef.current
            const activeLine = activeLineRef.current

            // Get the scrollable element from OverlayScrollbars
            const scrollViewport = container.querySelector('.os-viewport')
            if (!scrollViewport) return

            const containerRect = scrollViewport.getBoundingClientRect()
            const lineRect = activeLine.getBoundingClientRect()

            // Calculate if the active line is out of view
            const lineTop = lineRect.top - containerRect.top
            const lineBottom = lineRect.bottom - containerRect.top
            const containerHeight = containerRect.height

            // Scroll to center the active line
            const targetScrollTop =
                scrollViewport.scrollTop +
                lineTop -
                containerHeight / 3

            // On first load, jump instantly to current position
            // After that, use smooth scrolling
            const shouldInstantJump = !hasInitiallyScrolled.current

            if (shouldInstantJump || lineTop < containerHeight * 0.3 || lineBottom > containerHeight * 0.7) {
                scrollViewport.scrollTo({
                    top: Math.max(0, targetScrollTop),
                    behavior: shouldInstantJump ? 'instant' : 'smooth'
                })
                hasInitiallyScrolled.current = true
            }
        }
    }, [activeSegmentIndex])

    // Determine if we have synced lyrics (segments with timing)
    const hasSyncedLyrics = segments && segments.length > 0

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
                            <div className="lyrics-text" ref={scrollContainerRef}>
                                {hasSyncedLyrics ? (
                                    // Synced lyrics with highlighting
                                    <div className="synced-lyrics">
                                        {segments.map((segment, index) => {
                                            const isActive = index === activeSegmentIndex
                                            const isPast = index < activeSegmentIndex
                                            const isFuture = index > activeSegmentIndex

                                            return (
                                                <div
                                                    key={index}
                                                    ref={isActive ? activeLineRef : null}
                                                    className={`lyrics-line ${isActive ? 'active' : ''} ${isPast ? 'past' : ''} ${isFuture ? 'future' : ''}`}
                                                >
                                                    {segment.text}
                                                </div>
                                            )
                                        })}
                                    </div>
                                ) : (
                                    // Plain lyrics (no timing)
                                    lyrics
                                )}
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
