import { useEffect, useState } from 'react'
import './NotificationToast.css'

interface NotificationToastProps {
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  isVisible: boolean
  duration?: number
  onClose?: () => void
}

export function NotificationToast({ 
  message, 
  type, 
  isVisible,
  duration = 3000,
  onClose 
}: NotificationToastProps) {
  const [shouldRender, setShouldRender] = useState(isVisible)

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true)
      if (duration > 0) {
        const timer = setTimeout(() => {
          setShouldRender(false)
          onClose?.()
        }, duration)
        return () => clearTimeout(timer)
      }
    } else {
      const timer = setTimeout(() => {
        setShouldRender(false)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [isVisible, duration, onClose])

  if (!shouldRender) return null

  return (
    <div className={`notification-toast ${type} ${isVisible ? 'visible' : ''}`}>
      <div className="toast-content">
        <span className="toast-icon">
          {type === 'success' && '✓'}
          {type === 'error' && '✕'}
          {type === 'warning' && '⚠'}
          {type === 'info' && 'ℹ'}
        </span>
        <span className="toast-message">{message}</span>
        {onClose && (
          <button 
            className="toast-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        )}
      </div>
    </div>
  )
}




