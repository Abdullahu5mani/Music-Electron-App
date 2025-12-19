import { useEffect, useState } from 'react'
import trayIcon from '../../../assets/trayIcon.svg'
import minimizeIcon from '../../../assets/icons/minimize.svg'
import maximizeIcon from '../../../assets/icons/maximize.svg'
import restoreIcon from '../../../assets/icons/restore.svg'
import closeIcon from '../../../assets/icons/close.svg'
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
            <img src={minimizeIcon} alt="Minimize" className="control-icon" />
          </button>
          <button
            className="title-bar-button maximize-button"
            onClick={handleMaximize}
            aria-label={isMaximized ? 'Restore' : 'Maximize'}
          >
            <img src={isMaximized ? restoreIcon : maximizeIcon} alt={isMaximized ? 'Restore' : 'Maximize'} className="control-icon" />
          </button>
          <button
            className="title-bar-button close-button"
            onClick={handleClose}
            aria-label="Close"
          >
            <img src={closeIcon} alt="Close" className="control-icon" />
          </button>
        </div>
      </div>
    </div>
  )
}

