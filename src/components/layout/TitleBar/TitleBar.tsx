import { useEffect, useState } from 'react'
import trayIcon from '../../../assets/trayIcon.svg'
import './TitleBar.css'

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    // Listen for window state changes
    if (window.electronAPI?.onWindowStateChanged) {
      const cleanup = window.electronAPI.onWindowStateChanged((maximized: boolean) => {
        setIsMaximized(maximized)
      })
      return cleanup
    }
  }, [])

  const handleMinimize = () => {
    if (window.electronAPI?.minimizeWindow) {
      window.electronAPI.minimizeWindow()
    }
  }

  const handleMaximize = () => {
    if (window.electronAPI?.maximizeWindow) {
      window.electronAPI.maximizeWindow()
    }
  }

  const handleClose = () => {
    if (window.electronAPI?.closeWindow) {
      window.electronAPI.closeWindow()
    }
  }

  return (
    <div className="title-bar">
      <div className="title-bar-content">
        <div className="title-bar-title">
          <img src={trayIcon} alt="Music Sync App" className="title-icon" />
          <span>Music Sync App</span>
        </div>
        <div className="title-bar-controls">
          <button
            className="title-bar-button minimize-button"
            onClick={handleMinimize}
            aria-label="Minimize"
          >
            <span>−</span>
          </button>
          <button
            className="title-bar-button maximize-button"
            onClick={handleMaximize}
            aria-label={isMaximized ? 'Restore' : 'Maximize'}
          >
            <span>{isMaximized ? '❐' : '□'}</span>
          </button>
          <button
            className="title-bar-button close-button"
            onClick={handleClose}
            aria-label="Close"
          >
            <span>×</span>
          </button>
        </div>
      </div>
    </div>
  )
}

