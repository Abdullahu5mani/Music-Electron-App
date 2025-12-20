import './BatchScanProgress.css'
import type { ApiPhase } from '../../../hooks/useSongScanner'
import musicNoteIcon from '../../../assets/icons/music-note.svg'
import discIcon from '../../../assets/icons/disc.svg'
import folderIcon from '../../../assets/icons/folder.svg'
import downloadIcon from '../../../assets/icons/download.svg'
import refreshIcon from '../../../assets/icons/refresh.svg'
import closeIcon from '../../../assets/icons/close.svg'

interface BatchScanProgressProps {
  isVisible: boolean
  currentIndex: number
  totalCount: number
  currentSongName: string
  apiPhase?: ApiPhase
  onCancel?: () => void
}

// Map phases to display text and icons
const phaseDisplay: Record<Exclude<ApiPhase, null>, { icon: string; text: string }> = {
  acoustid: { icon: musicNoteIcon, text: 'AcoustID lookup...' },
  musicbrainz: { icon: discIcon, text: 'MusicBrainz lookup...' },
  coverart: { icon: folderIcon, text: 'Cover Art lookup...' },
  writing: { icon: downloadIcon, text: 'Writing metadata...' }
}

/**
 * Floating notification showing batch scan progress
 * Displays in top-right corner
 */
export function BatchScanProgress({
  isVisible,
  currentIndex,
  totalCount,
  currentSongName,
  apiPhase,
  onCancel
}: BatchScanProgressProps) {
  if (!isVisible) return null

  const percentage = totalCount > 0 ? Math.round((currentIndex / totalCount) * 100) : 0
  const phase = apiPhase ? phaseDisplay[apiPhase] : null

  return (
    <div className="batch-scan-progress">
      <div className="batch-scan-header">
        <span className="batch-scan-title"><img src={refreshIcon} alt="" className="batch-scan-title-icon" /> Scanning Library</span>
        {onCancel && (
          <button
            className="batch-scan-cancel"
            onClick={onCancel}
            title="Cancel scan"
          >
            <img src={closeIcon} alt="Cancel" className="batch-scan-cancel-icon" />
          </button>
        )}
      </div>

      <div className="batch-scan-count">
        {currentIndex} of {totalCount}
      </div>

      <div className="batch-scan-bar-container">
        <div
          className="batch-scan-bar-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {phase && (
        <div className="batch-scan-phase">
          <img src={phase.icon} alt="" className="batch-scan-phase-icon" /> {phase.text}
        </div>
      )}

      <div className="batch-scan-song" title={currentSongName}>
        {currentSongName.length > 35
          ? currentSongName.substring(0, 32) + '...'
          : currentSongName
        }
      </div>
    </div>
  )
}
