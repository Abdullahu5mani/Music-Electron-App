import { useState, useMemo, useEffect } from 'react'
import type { MusicFile } from '../../electron/musicScanner'
import { sortMusicFiles, type SortOption } from '../utils/sortMusicFiles'

interface UseMusicLibraryReturn {
  musicFiles: MusicFile[]
  sortedMusicFiles: MusicFile[]
  loading: boolean
  error: string | null
  selectedFolder: string | null
  sortBy: SortOption
  setSortBy: (sortBy: SortOption) => void
  handleSelectFolder: () => Promise<void>
  scanFolder: (folderPath: string) => Promise<void>
  updateSingleFile: (filePath: string) => Promise<MusicFile | null>
}

/**
 * Custom hook for managing music library
 */
export function useMusicLibrary(): UseMusicLibraryReturn {
  const [musicFiles, setMusicFiles] = useState<MusicFile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortOption>('title')

  // Sort music files based on selected sort option
  const sortedMusicFiles = useMemo(() => {
    return sortMusicFiles(musicFiles, sortBy)
  }, [musicFiles, sortBy])

  // Load saved music folder on mount
  useEffect(() => {
    const loadSavedFolder = async () => {
      try {
        const settings = await window.electronAPI?.getSettings()
        if (settings?.musicFolderPath && !selectedFolder) {
          setSelectedFolder(settings.musicFolderPath)
          await scanFolder(settings.musicFolderPath)
        }
      } catch (error) {
        console.error('Failed to load saved music folder:', error)
      }
    }
    loadSavedFolder()
  }, [])

  const handleSelectFolder = async () => {
    try {
      setLoading(true)
      setError(null)
      const folderPath = await window.electronAPI.selectMusicFolder()

      if (folderPath) {
        setSelectedFolder(folderPath)
        await scanFolder(folderPath)
      }
    } catch (err) {
      setError('Failed to select folder')
      console.error('Error selecting folder:', err)
    } finally {
      setLoading(false)
    }
  }

  const scanFolder = async (folderPath: string) => {
    try {
      setLoading(true)
      setError(null)
      const files = await window.electronAPI.scanMusicFolder(folderPath)
      // Add dateAdded timestamp to each file
      const filesWithDate = files.map(file => ({
        ...file,
        dateAdded: Date.now(), // Use current timestamp for all files scanned together
      }))
      setMusicFiles(filesWithDate)
    } catch (err) {
      setError('Failed to scan music folder')
      console.error('Error scanning folder:', err)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Updates a single file's metadata in-place without rescanning the whole library.
   * This is used after tagging a file to update its display without losing scroll position.
   */
  const updateSingleFile = async (filePath: string): Promise<MusicFile | null> => {
    try {
      const updatedFile = await window.electronAPI.readSingleFileMetadata(filePath)
      if (updatedFile) {
        // Update the file in-place in the musicFiles array
        setMusicFiles(prevFiles => 
          prevFiles.map(file => 
            file.path === filePath 
              ? { ...updatedFile, dateAdded: file.dateAdded || Date.now() }
              : file
          )
        )
        return updatedFile
      }
      return null
    } catch (err) {
      console.error('Error updating single file metadata:', err)
      return null
    }
  }

  return {
    musicFiles,
    sortedMusicFiles,
    loading,
    error,
    selectedFolder,
    sortBy,
    setSortBy,
    handleSelectFolder,
    scanFolder,
    updateSingleFile,
  }
}

