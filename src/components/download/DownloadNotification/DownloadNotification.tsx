import { useEffect, useState } from 'react'
import './DownloadNotification.css'

interface DownloadNotificationProps {
  title: string
  progress: number
  isVisible: boolean
  onClose?: () => void
  onCancel?: () => void
}

export function DownloadNotification({
  title,
  progress,
  isVisible,
  onClose,
  onCancel
}: DownloadNotificationProps) {
  const [shouldRender, setShouldRender] = useState(isVisible)

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true)
    } else {
      // Delay removal for fade-out animation
      const timer = setTimeout(() => {
        setShouldRender(false)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [isVisible])

  if (!shouldRender) return null

  return (
    <div className={`download-notification ${isVisible ? 'visible' : ''}`}>
      <div className="notification-content">
        <div className="notification-header">
          <span className="notification-icon">⬇️</span>
          <span className="notification-title">{title}</span>
          {onClose && (
            <button
              className="notification-close"
              onClick={onClose}
              aria-label="Close"
            >
              ×
            </button>
          )}
        </div>
        <div className="notification-progress">
          <div className="notification-progress-bar">
            <div
              className="notification-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="notification-footer">
            <span className="notification-progress-text">{Math.round(progress)}%</span>
            {onCancel && (
              <button className="notification-cancel" onClick={onCancel}>
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}




