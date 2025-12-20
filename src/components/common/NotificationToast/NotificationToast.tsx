import { useEffect, useState } from 'react'
import successIcon from '../../../assets/icons/success.svg'
import errorIcon from '../../../assets/icons/error.svg'
import warningIcon from '../../../assets/icons/warning.svg'
import infoIcon from '../../../assets/icons/info.svg'
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
          {type === 'success' && <img src={successIcon} alt="" className="toast-icon-img" />}
          {type === 'error' && <img src={errorIcon} alt="" className="toast-icon-img" />}
          {type === 'warning' && <img src={warningIcon} alt="" className="toast-icon-img" />}
          {type === 'info' && <img src={infoIcon} alt="" className="toast-icon-img" />}
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




