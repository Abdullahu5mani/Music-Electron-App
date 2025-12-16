import fs from 'fs'
import path from 'path'
import { app } from 'electron'

const CONFIG_FILE = 'app-config.json'

export interface AppSettings {
  musicFolderPath: string | null
  downloadFolderPath: string | null
  scanSubfolders: boolean
}

/**
 * Gets the path to the config file
 */
function getConfigPath(): string {
  return path.join(app.getPath('userData'), CONFIG_FILE)
}

/**
 * Gets stored settings from config file
 */
export function getStoredSettings(): AppSettings {
  try {
    const configPath = getConfigPath()
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf-8')
      const config = JSON.parse(data)
      return {
        musicFolderPath: config.musicFolderPath || null,
        downloadFolderPath: config.downloadFolderPath || null,
        scanSubfolders: config.scanSubfolders !== false, // Default to true
      }
    }
  } catch (error) {
    console.error('Error reading config:', error)
  }
  return {
    musicFolderPath: null,
    downloadFolderPath: null,
    scanSubfolders: true, // Default to true
  }
}

/**
 * Saves settings to config file
 */
export function saveSettings(settings: AppSettings): void {
  try {
    const configPath = getConfigPath()
    const config = {
      musicFolderPath: settings.musicFolderPath,
      downloadFolderPath: settings.downloadFolderPath,
      scanSubfolders: settings.scanSubfolders,
    }
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8')
  } catch (error) {
    console.error('Error saving config:', error)
    throw error
  }
}

/**
 * Gets stored music folder path
 */
export function getStoredMusicFolder(): string | null {
  return getStoredSettings().musicFolderPath
}

/**
 * Gets stored download folder path
 */
export function getStoredDownloadFolder(): string | null {
  return getStoredSettings().downloadFolderPath
}



















