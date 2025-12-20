import { useState, useEffect } from 'react'
import type { AppSettings, BinaryStatus, PlatformInfo, WhisperModel } from '../../../types/electron.d'
import type { VisualizerMode } from '../../common/AudioVisualizer/AudioVisualizer'
import successIcon from '../../../assets/icons/success.svg'
import refreshIcon from '../../../assets/icons/refresh.svg'
import infoIcon from '../../../assets/icons/info.svg'
import './Settings.css'

interface SettingsProps {
  isOpen: boolean
  onClose: () => void
  onSettingsChange: () => void
  onScanAll?: () => void
  isBatchScanning?: boolean
  unscannedCount?: number
  totalSongCount?: number
  visualizerMode: VisualizerMode
  onVisualizerModeChange: (mode: VisualizerMode) => void
}

export function Settings({
  isOpen,
  onClose,
  onSettingsChange,
  onScanAll,
  isBatchScanning = false,
  unscannedCount = 0,
  totalSongCount = 0,
  visualizerMode,
  onVisualizerModeChange
}: SettingsProps) {
  const [settings, setSettings] = useState<AppSettings>({
    musicFolderPath: null,
    downloadFolderPath: null,
    scanSubfolders: true,
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [binaryStatuses, setBinaryStatuses] = useState<BinaryStatus[]>([])
  const [loadingBinaries, setLoadingBinaries] = useState(false)
  const [platformInfo, setPlatformInfo] = useState<PlatformInfo | null>(null)
  const [installingBinary, setInstallingBinary] = useState<string | null>(null)
  const [installProgress, setInstallProgress] = useState<{ message: string; percentage: number } | null>(null)
  const [whisperModels, setWhisperModels] = useState<WhisperModel[]>([])
  const [selectedWhisperModel, setSelectedWhisperModel] = useState<WhisperModel | null>(null)

  // Load settings when modal opens
  useEffect(() => {
    if (isOpen) {
      loadSettings()
      loadBinaryStatuses()
      loadPlatformInfo()
      loadWhisperModels()
    }
  }, [isOpen])

  // Listen for binary install progress
  useEffect(() => {
    const cleanup = window.electronAPI?.onBinaryInstallProgress((progress) => {
      setInstallProgress({ message: progress.message, percentage: progress.percentage })
      if (progress.status === 'installed' || progress.status === 'error') {
        // Refresh binary statuses after install completes
        setTimeout(() => {
          setInstallingBinary(null)
          setInstallProgress(null)
          loadBinaryStatuses()
        }, 1500)
      }
    })
    return cleanup
  }, [])

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

  const loadWhisperModels = async () => {
    try {
      const models = await window.electronAPI?.getWhisperModels()
      const selected = await window.electronAPI?.getSelectedWhisperModel()
      if (models) {
        setWhisperModels(models)
      }
      if (selected) {
        setSelectedWhisperModel(selected)
      }
    } catch (err) {
      console.error('Error loading whisper models:', err)
    }
  }

  const handleWhisperModelChange = async (modelId: string) => {
    try {
      await window.electronAPI?.setWhisperModel(modelId)
      const selected = await window.electronAPI?.getSelectedWhisperModel()
      if (selected) {
        setSelectedWhisperModel(selected)
      }
    } catch (err) {
      console.error('Error setting whisper model:', err)
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

  const handleInstallBinary = async (binaryName: string) => {
    setInstallingBinary(binaryName)
    setInstallProgress({ message: 'Starting installation...', percentage: 0 })

    try {
      if (binaryName === 'yt-dlp') {
        await window.electronAPI?.installYtdlp()
      } else if (binaryName.includes('fpcalc') || binaryName.includes('Chromaprint')) {
        await window.electronAPI?.installFpcalc()
      } else if (binaryName.includes('whisper') || binaryName.includes('Transcription')) {
        await window.electronAPI?.installWhisper()
      }
    } catch (err) {
      console.error('Error installing binary:', err)
      setInstallingBinary(null)
      setInstallProgress(null)
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

              {/* Scan Subfolders Toggle */}
              <div className="settings-section">
                <div className="settings-toggle-row">
                  <div className="settings-toggle-info">
                    <label className="settings-label">Scan Subfolders</label>
                    <p className="settings-description">
                      Include songs from subfolders when scanning your music folder
                    </p>
                  </div>
                  <button
                    type="button"
                    className={`settings-toggle ${settings.scanSubfolders ? 'active' : ''}`}
                    onClick={() => setSettings(prev => ({ ...prev, scanSubfolders: !prev.scanSubfolders }))}
                    aria-pressed={settings.scanSubfolders}
                  >
                    <span className="settings-toggle-slider" />
                  </button>
                </div>
              </div>

              {/* Library Scan Section */}
              <div className="settings-section scan-library-section">
                <label className="settings-label">Library Scanner</label>
                <p className="settings-description">
                  Scan your entire library to identify songs and fetch metadata
                </p>
                <div className="scan-library-info">
                  <div className="scan-stats">
                    <span className="scan-stat">
                      <strong>{totalSongCount}</strong> total songs
                    </span>
                    <span className="scan-stat">
                      <strong>{unscannedCount}</strong> unscanned
                    </span>
                    <span className="scan-stat">
                      <strong>{totalSongCount - unscannedCount}</strong> already scanned
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onScanAll?.()
                      onClose()
                    }}
                    className="scan-all-button"
                    disabled={isBatchScanning || unscannedCount === 0}
                  >
                    {isBatchScanning ? (
                      <>Scanning...</>
                    ) : unscannedCount === 0 ? (
                      <><img src={successIcon} alt="" className="settings-btn-icon" /> All songs scanned</>
                    ) : (
                      <>Scan {unscannedCount} Unscanned Songs</>
                    )}
                  </button>
                </div>
              </div>

              <div className="settings-section">
                <label className="settings-label">Visualizer Mode</label>
                <p className="settings-description">
                  Choose the style of the audio visualizer in the playback bar
                </p>
                <div className="settings-options-group">
                  <button
                    type="button"
                    className={`settings-option ${visualizerMode === 'bars' ? 'active' : ''}`}
                    onClick={() => onVisualizerModeChange('bars')}
                  >
                    Bars
                  </button>
                  <button
                    type="button"
                    className={`settings-option ${visualizerMode === 'wave' ? 'active' : ''}`}
                    onClick={() => onVisualizerModeChange('wave')}
                  >
                    Wave
                  </button>
                  <button
                    type="button"
                    className={`settings-option ${visualizerMode === 'off' ? 'active' : ''}`}
                    onClick={() => onVisualizerModeChange('off')}
                  >
                    Off
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
                    <img src={refreshIcon} alt="Refresh" className="binary-refresh-icon" />
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
                        <div className="binary-actions">
                          {installingBinary === binary.name ? (
                            <div className="binary-installing">
                              <span className="binary-install-message">
                                {installProgress?.message || 'Installing...'}
                              </span>
                              {installProgress?.percentage !== undefined && (
                                <div className="binary-progress-bar">
                                  <div
                                    className="binary-progress-fill"
                                    style={{ width: `${installProgress.percentage}%` }}
                                  />
                                </div>
                              )}
                            </div>
                          ) : (
                            <button
                              type="button"
                              className={`binary-install-button ${binary.installed ? 'update' : 'install'}`}
                              onClick={() => handleInstallBinary(binary.name)}
                              disabled={installingBinary !== null}
                            >
                              {binary.installed && binary.needsUpdate ? 'Update' : binary.installed ? 'Reinstall' : 'Install'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Whisper Model Selection */}
              <div className="settings-section">
                <label className="settings-label">Whisper AI Model</label>
                <p className="settings-description">
                  Choose transcription model. Larger models are more accurate but slower.
                </p>
                <select
                  className="settings-select"
                  value={selectedWhisperModel?.id || 'small.en'}
                  onChange={(e) => handleWhisperModelChange(e.target.value)}
                >
                  {whisperModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name} ({model.size}) - {model.description}
                    </option>
                  ))}
                </select>
                {selectedWhisperModel && (
                  <div className="whisper-model-info">
                    <span className="model-size"><img src={infoIcon} alt="" className="whisper-info-icon" /> {selectedWhisperModel.size}</span>
                    <span className="model-desc">{selectedWhisperModel.description}</span>
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









