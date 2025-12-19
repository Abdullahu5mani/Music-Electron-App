import { useState } from 'react'
import downloadIcon from '../../../assets/icons/download.svg'
import './DownloadButton.css'

interface DownloadButtonProps {
  onDownload: (url: string) => void
  isDownloading: boolean
  progress?: number
  binaryStatus?: string
  binaryProgress?: number
}

export function DownloadButton({
  onDownload,
  isDownloading,
  binaryStatus,
  binaryProgress
}: DownloadButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [url, setUrl] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (url.trim()) {
      onDownload(url.trim())
      setUrl('')
      setIsOpen(false)
    }
  }

  return (
    <div className="download-button-container">
      <button
        className="download-button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isDownloading}
      >
        <img src={downloadIcon} alt="" className="download-icon" /> Download
      </button>

      {isOpen && (
        <div className="download-modal">
          <div className="download-modal-content">
            <h3>Download from YouTube</h3>
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                placeholder="Insert YouTube link"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="download-input"
                autoFocus
                disabled={isDownloading}
              />
              <div className="download-modal-actions">
                <button
                  type="submit"
                  className="download-submit"
                  disabled={isDownloading || !url.trim()}
                >
                  {isDownloading ? 'Downloading...' : 'Download'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false)
                    setUrl('')
                  }}
                  className="download-cancel"
                  disabled={isDownloading}
                >
                  Cancel
                </button>
              </div>
            </form>

            {/* Binary download progress */}
            {binaryStatus && binaryStatus !== '' && (
              <div className="download-progress">
                <div className="progress-label">{binaryStatus}</div>
                {binaryProgress !== undefined && (
                  <>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${binaryProgress}%` }}
                      />
                    </div>
                    <span>{Math.round(binaryProgress)}%</span>
                  </>
                )}
              </div>
            )}


            {/* Rate limiting notice */}
            {isDownloading && (
              <div className="rate-limit-notice">
                <small>Note: 10-second delay between downloads to avoid rate limiting</small>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

