import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import type { MusicFile } from '../../electron/musicScanner'
import { sortMusicFiles, type SortOption } from '../utils/sortMusicFiles'

// Extend MusicFile locally with an optional dateAdded for UI sorting
type MusicFileWithDate = MusicFile & { dateAdded?: number }

interface UseMusicLibraryReturn {
  musicFiles: MusicFileWithDate[]
  sortedMusicFiles: MusicFileWithDate[]
  loading: boolean
  error: string | null
  selectedFolder: string | null
  sortBy: SortOption
  setSortBy: (sortBy: SortOption) => void
  handleSelectFolder: () => Promise<void>
  scanFolder: (folderPath: string) => Promise<void>
  updateSingleFile: (filePath: string) => Promise<MusicFile | null>
  isWatching: boolean
}

/**
 * Custom hook for managing music library
 * Includes automatic file system watching for real-time updates
 */
export function useMusicLibrary(): UseMusicLibraryReturn {
  const [musicFiles, setMusicFiles] = useState<MusicFileWithDate[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortOption>('title')
  const [isWatching, setIsWatching] = useState(false)

  // Track the current folder for the file watcher event handler
  const selectedFolderRef = useRef<string | null>(null)
  selectedFolderRef.current = selectedFolder

  // Sort music files based on selected sort option
  const sortedMusicFiles = useMemo(() => {
    return sortMusicFiles(musicFiles, sortBy)
  }, [musicFiles, sortBy])

  /**
   * Handle file watcher events
   */
  const handleFileWatcherEvent = useCallback(async (event: { type: 'added' | 'removed' | 'changed'; files: string[] }) => {
    console.log(`[FileWatcher Event] ${event.type}: ${event.files.length} files`)

    if (event.type === 'removed') {
      // Remove files from the library
      setMusicFiles(prevFiles =>
        prevFiles.filter(file => !event.files.includes(file.path))
      )
    } else if (event.type === 'changed' || event.type === 'added') {
      // For changed/added files, read their metadata and update/add to library
      for (const filePath of event.files) {
        try {
          const fileData = await window.electronAPI.readSingleFileMetadata(filePath)
          if (fileData) {
            setMusicFiles(prevFiles => {
              const existingIndex = prevFiles.findIndex(f => f.path === filePath)
              if (existingIndex >= 0) {
                // Update existing file
                const updated = [...prevFiles]
                updated[existingIndex] = {
                  ...fileData,
                  dateAdded: prevFiles[existingIndex].dateAdded ?? Date.now()
                }
                return updated
              } else {
                // Add new file
                return [...prevFiles, { ...fileData, dateAdded: Date.now() }]
              }
            })
          }
        } catch (err) {
          console.error(`Failed to read metadata for ${filePath}:`, err)
        }
      }
    }
  }, [])

  /**
   * Start watching the selected folder
   */
  const startWatching = useCallback(async (folderPath: string) => {
    try {
      const result = await window.electronAPI.fileWatcherStart(folderPath)
      if (result.success) {
        setIsWatching(true)
        console.log('[useMusicLibrary] File watcher started for:', folderPath)
      } else {
        console.error('[useMusicLibrary] Failed to start file watcher:', result.error)
      }
    } catch (err) {
      console.error('[useMusicLibrary] Error starting file watcher:', err)
    }
  }, [])

  /**
   * Stop watching
   */
  const stopWatching = useCallback(async () => {
    try {
      await window.electronAPI.fileWatcherStop()
      setIsWatching(false)
      console.log('[useMusicLibrary] File watcher stopped')
    } catch (err) {
      console.error('[useMusicLibrary] Error stopping file watcher:', err)
    }
  }, [])

  // Set up file watcher event listener
  useEffect(() => {
    const cleanup = window.electronAPI.onFileWatcherEvent(handleFileWatcherEvent)
    return cleanup
  }, [handleFileWatcherEvent])

  // Stop watching on unmount
  useEffect(() => {
    return () => {
      stopWatching()
    }
  }, [stopWatching])

  // Load saved music folder on mount
  useEffect(() => {
    const loadSavedFolder = async () => {
      try {
        const settings = await window.electronAPI?.getSettings()
        if (settings?.musicFolderPath && !selectedFolder) {
          setSelectedFolder(settings.musicFolderPath)
          await scanFolder(settings.musicFolderPath, settings.scanSubfolders)
          // Start watching after initial scan
          await startWatching(settings.musicFolderPath)
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

      // Stop existing watcher
      if (isWatching) {
        await stopWatching()
      }

      const folderPath = await window.electronAPI.selectMusicFolder()

      if (folderPath) {
        setSelectedFolder(folderPath)
        // Get settings to determine if we should scan subfolders
        const settings = await window.electronAPI.getSettings()
        await scanFolder(folderPath, settings.scanSubfolders)
        // Start watching the new folder
        await startWatching(folderPath)
      }
    } catch (err) {
      setError('Failed to select folder')
      console.error('Error selecting folder:', err)
    } finally {
      setLoading(false)
    }
  }

  const scanFolder = async (folderPath: string, scanSubfolders: boolean = true) => {
    try {
      setLoading(true)
      setError(null)
      const files = await window.electronAPI.scanMusicFolder(folderPath, { scanSubfolders })

      // Yield to main thread to let UI update before processing large array
      // This prevents the "frozen" feeling after scan completes
      await new Promise(resolve => setTimeout(resolve, 0))

      // Use file mtimeMs (dateAdded from backend); fallback to current time if missing
      const filesWithDate = files.map(file => ({
        ...file,
        dateAdded: file.dateAdded ?? Date.now(),
      }))

      // Update state (React will batch this efficiently)
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
              ? { ...updatedFile, dateAdded: updatedFile.dateAdded ?? file.dateAdded ?? Date.now() }
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
    isWatching,
  }
}
