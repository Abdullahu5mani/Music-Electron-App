import { useState, useEffect } from 'react'
import type { AppSettings, BinaryStatus, PlatformInfo } from '../electron.d'
import './Settings.css'

interface SettingsProps {
  isOpen: boolean
  onClose: () => void
  onSettingsChange: () => void
}

export function Settings({ isOpen, onClose, onSettingsChange }: SettingsProps) {
  const [settings, setSettings] = useState<AppSettings>({
    musicFolderPath: null,
    downloadFolderPath: null,
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [binaryStatuses, setBinaryStatuses] = useState<BinaryStatus[]>([])
  const [loadingBinaries, setLoadingBinaries] = useState(false)
  const [platformInfo, setPlatformInfo] = useState<PlatformInfo | null>(null)

  // Load settings when modal opens
  useEffect(() => {
    if (isOpen) {
      loadSettings()
      loadBinaryStatuses()
      loadPlatformInfo()
    }
  }, [isOpen])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const currentSettings = await window.electronAPI?.getSettings()
      if (currentSettings) {
        setSettings(currentSettings)
      }
    } catch (err) {
      setError('Failed to load settings')
      console.error('Error loading settings:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadBinaryStatuses = async () => {
    try {
      setLoadingBinaries(true)
      const statuses = await window.electronAPI?.getBinaryStatuses()
      if (statuses) {
        setBinaryStatuses(statuses)
      }
    } catch (err) {
      console.error('Error loading binary statuses:', err)
    } finally {
      setLoadingBinaries(false)
    }
  }

  const loadPlatformInfo = async () => {
    try {
      const info = await window.electronAPI?.getPlatformInfo()
      if (info) {
        setPlatformInfo(info)
      }
    } catch (err) {
      console.error('Error loading platform info:', err)
    }
  }

  const handleSelectMusicFolder = async () => {
    try {
      const folderPath = await window.electronAPI?.selectMusicFolder()
      if (folderPath) {
        setSettings(prev => ({ ...prev, musicFolderPath: folderPath }))
      }
    } catch (err) {
      setError('Failed to select music folder')
      console.error('Error selecting music folder:', err)
    }
  }

  const handleSelectDownloadFolder = async () => {
    try {
      const folderPath = await window.electronAPI?.selectDownloadFolder()
      if (folderPath) {
        setSettings(prev => ({ ...prev, downloadFolderPath: folderPath }))
      }
    } catch (err) {
      setError('Failed to select download folder')
      console.error('Error selecting download folder:', err)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)
      const result = await window.electronAPI?.saveSettings(settings)
      if (result?.success) {
        onSettingsChange()
        onClose()
      } else {
        setError(result?.error || 'Failed to save settings')
      }
    } catch (err) {
      setError('Failed to save settings')
      console.error('Error saving settings:', err)
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="settings-modal" onClick={onClose}>
      <div className="settings-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="settings-close-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {error && (
          <div className="settings-error">{error}</div>
        )}

        <div className="settings-body">
          {loading ? (
            <div className="settings-loading">Loading settings...</div>
          ) : (
            <>
              <div className="settings-section">
                <label className="settings-label">Music Folder</label>
                <p className="settings-description">
                  Folder where your music files are located
                </p>
                <div className="settings-folder-selector">
                  <input
                    type="text"
                    value={settings.musicFolderPath || ''}
                    readOnly
                    className="settings-folder-input"
                    placeholder="No folder selected"
                  />
                  <button
                    type="button"
                    onClick={handleSelectMusicFolder}
                    className="settings-select-button"
                  >
                    Browse
                  </button>
                </div>
              </div>

              <div className="settings-section">
                <label className="settings-label">Download Folder</label>
                <p className="settings-description">
                  Folder where YouTube downloads will be saved
                </p>
                <div className="settings-folder-selector">
                  <input
                    type="text"
                    value={settings.downloadFolderPath || ''}
                    readOnly
                    className="settings-folder-input"
                    placeholder="No folder selected"
                  />
                  <button
                    type="button"
                    onClick={handleSelectDownloadFolder}
                    className="settings-select-button"
                  >
                    Browse
                  </button>
                </div>
              </div>

              {/* Binary Manager Section */}
              <div className="settings-section binary-manager-section">
                <div className="binary-manager-header">
                  <div>
                    <label className="settings-label">Binary Manager</label>
                    <p className="settings-description">
                      Status of required binaries for app functionality
                    </p>
                    {platformInfo && (
                      <div className="platform-info">
                        <span className="platform-label">Platform:</span>
                        <span className="platform-value">
                          {platformInfo.platform === 'win32' ? 'Windows' : 
                           platformInfo.platform === 'darwin' ? 'macOS' : 
                           platformInfo.platform === 'linux' ? 'Linux' : 
                           platformInfo.platform}
                        </span>
                        <span className="platform-label">Architecture:</span>
                        <span className="platform-value">
                          {platformInfo.arch === 'x64' ? 'x64 (64-bit)' : 
                           platformInfo.arch === 'arm64' ? 'ARM64' : 
                           platformInfo.arch === 'ia32' ? 'x86 (32-bit)' : 
                           platformInfo.arch}
                        </span>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={loadBinaryStatuses}
                    className="binary-refresh-button"
                    disabled={loadingBinaries}
                    title="Refresh binary statuses"
                  >
                    ↻
                  </button>
                </div>
                {loadingBinaries ? (
                  <div className="binary-loading">Loading binary statuses...</div>
                ) : (
                  <div className="binary-list">
                    {binaryStatuses.map((binary) => (
                      <div key={binary.name} className="binary-item">
                        <div className="binary-info">
                          <span className="binary-name">{binary.name}</span>
                          {binary.installed ? (
                            <>
                              <span className={`binary-status installed ${binary.needsUpdate ? 'needs-update' : ''}`}>
                                {binary.needsUpdate ? 'Update Available' : 'Installed'}
                              </span>
                              {binary.version && (
                                <span className="binary-version">
                                  v{binary.version}
                                  {binary.latestVersion && binary.needsUpdate && (
                                    <span className="binary-latest"> → v{binary.latestVersion}</span>
                                  )}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="binary-status missing">Missing</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="settings-footer">
          <button
            type="button"
            onClick={onClose}
            className="settings-cancel-button"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="settings-save-button"
            disabled={saving || loading}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}









