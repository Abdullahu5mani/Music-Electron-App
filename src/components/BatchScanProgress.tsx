import './BatchScanProgress.css'

interface BatchScanProgressProps {
  isVisible: boolean
  currentIndex: number
  totalCount: number
  currentSongName: string
  onCancel?: () => void
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
  onCancel
}: BatchScanProgressProps) {
  if (!isVisible) return null

  const percentage = totalCount > 0 ? Math.round((currentIndex / totalCount) * 100) : 0

  return (
    <div className="batch-scan-progress">
      <div className="batch-scan-header">
        <span className="batch-scan-title">🔍 Scanning Library</span>
        {onCancel && (
          <button 
            className="batch-scan-cancel"
            onClick={onCancel}
            title="Cancel scan"
          >
            ✕
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
      
      <div className="batch-scan-song" title={currentSongName}>
        {currentSongName.length > 35 
          ? currentSongName.substring(0, 32) + '...' 
          : currentSongName
        }
      </div>
    </div>
  )
}

