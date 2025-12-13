import { useState, useCallback, useRef } from 'react'
import type { MusicFile } from '../../electron/musicScanner'
import type { ScanStatusType } from '../types/electron.d'
import { generateFingerprint, resetFingerprintErrors } from '../services/fingerprint'
import { lookupFingerprint } from '../services/acoustid'
import { lookupRecording, getCoverArtUrls, pickBestRelease } from '../services/musicbrainz'
import { waitForAcoustID, waitForMusicBrainz, waitForCoverArt, waitBetweenSongs } from '../utils/rateLimiter'

export interface ScanResult {
  success: boolean
  status: ScanStatusType
  title?: string
  artist?: string
  error?: string
}

export type ApiPhase = 'acoustid' | 'musicbrainz' | 'coverart' | 'writing' | null

export interface BatchScanProgress {
  isScanning: boolean
  currentIndex: number
  totalCount: number
  currentSongName: string
  apiPhase?: ApiPhase
}

interface UseSongScannerOptions {
  onShowNotification?: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void
  onUpdateSingleFile?: (filePath: string) => Promise<MusicFile | null>
  onStatusUpdate?: (filePath: string, status: ScanStatusType) => void
}

/**
 * Custom hook for scanning songs with rate limiting
 * Can be used for both individual and batch scanning
 */
export function useSongScanner(options: UseSongScannerOptions = {}) {
  const { onShowNotification, onUpdateSingleFile, onStatusUpdate } = options

  const [isScanning, setIsScanning] = useState(false)
  const [batchProgress, setBatchProgress] = useState<BatchScanProgress>({
    isScanning: false,
    currentIndex: 0,
    totalCount: 0,
    currentSongName: '',
    apiPhase: null
  })

  const cancelledRef = useRef(false)

  // Helper to update just the API phase without changing other progress fields
  const updateApiPhase = (phase: ApiPhase) => {
    setBatchProgress(prev => ({ ...prev, apiPhase: phase }))
  }

  /**
   * Scan a single song with rate limiting
   */
  const scanSong = useCallback(async (file: MusicFile): Promise<ScanResult> => {

    try {
      // Step 1: Generate fingerprint (local, no rate limit needed)
      const fingerprint = await generateFingerprint(file.path)

      if (!fingerprint) {
        await window.electronAPI.cacheMarkFileScanned(file.path, null, false)
        onStatusUpdate?.(file.path, 'scanned-no-match')
        return { success: false, status: 'scanned-no-match', error: 'Failed to generate fingerprint' }
      }

      // Step 2: Wait for rate limit, then query AcoustID
      await waitForAcoustID()
      const duration = file.metadata?.duration || 0
      const acoustidResult = await lookupFingerprint(fingerprint, duration)

      if (!acoustidResult) {
        await window.electronAPI.cacheMarkFileScanned(file.path, null, false)
        onStatusUpdate?.(file.path, 'scanned-no-match')
        onShowNotification?.(`No match found for "${file.name.replace(/\.[^/.]+$/, '')}"`, 'info')
        return { success: false, status: 'scanned-no-match', error: 'No AcoustID match' }
      }


      // Step 3: Wait for rate limit, then query MusicBrainz
      await waitForMusicBrainz()
      const mbData = await lookupRecording(acoustidResult.mbid)

      if (!mbData) {
        await window.electronAPI.cacheMarkFileScanned(file.path, acoustidResult.mbid, false)
        onStatusUpdate?.(file.path, 'scanned-no-match')
        onShowNotification?.(`No metadata found for "${file.name.replace(/\.[^/.]+$/, '')}"`, 'info')
        return { success: false, status: 'scanned-no-match', error: 'No MusicBrainz data' }
      }

      // Extract metadata
      const title = mbData.title
      const artistCredit = mbData['artist-credit']
      const album = pickBestRelease(mbData.releases)

      let fullArtist = ''
      if (artistCredit && artistCredit.length > 0) {
        fullArtist = artistCredit.map((credit: any) => {
          const name = credit.name || credit.artist?.name || ''
          const joinphrase = credit.joinphrase || ''
          return name + joinphrase
        }).join('')
      }

      let year: number | undefined
      if (album?.date) {
        const yearMatch = album.date.match(/^(\d{4})/)
        if (yearMatch) {
          year = parseInt(yearMatch[1], 10)
        }
      }

      // Step 4: Download cover art with rate limiting
      let coverArtPath: string | undefined
      const releases = mbData.releases || []

      if (releases.length > 0) {
        const releaseGroupId = (mbData as any)['release-group']?.id
        const coverUrls = getCoverArtUrls(releases, releaseGroupId)

        const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase()
        const filename = `cover_${safeTitle}_${releases[0].id}.jpg`
        const targetPath = `assets/${filename}`

        try {
          await waitForCoverArt()
          const downloadResult = await window.electronAPI.downloadImageWithFallback(coverUrls, targetPath)
          if (downloadResult.success) {
            coverArtPath = targetPath
          } else {
            onShowNotification?.(`No cover art found for "${title}"`, 'warning')
          }
        } catch (err) {
          console.warn('Failed to download cover art:', err)
        }
      }

      // Step 5: Write metadata to file
      const metadataResult = await window.electronAPI.writeMetadata(file.path, {
        title: title,
        artist: fullArtist || mbData['artist-credit']?.[0]?.name,
        album: album?.title,
        year: year,
        coverArtPath: coverArtPath,
      })

      if (metadataResult.success) {
        await window.electronAPI.cacheMarkFileScanned(file.path, acoustidResult.mbid, true)
        onStatusUpdate?.(file.path, 'scanned-tagged')
        onShowNotification?.(`Tagged: "${title}" by ${fullArtist || 'Unknown Artist'}`, 'success')
        return { success: true, status: 'scanned-tagged', title, artist: fullArtist }
      } else {
        await window.electronAPI.cacheMarkFileScanned(file.path, acoustidResult.mbid, false)
        onStatusUpdate?.(file.path, 'scanned-no-match')
        onShowNotification?.(`Failed to write metadata to "${file.name}"`, 'error')
        return { success: false, status: 'scanned-no-match', error: 'Failed to write metadata' }
      }
    } catch (error) {
      console.error('Error scanning song:', error)
      await window.electronAPI.cacheMarkFileScanned(file.path, null, false)
      onStatusUpdate?.(file.path, 'scanned-no-match')
      return { success: false, status: 'scanned-no-match', error: String(error) }
    }
  }, [onShowNotification, onStatusUpdate])

  /**
   * Process a single song AFTER fingerprint is already generated
   * This handles the API lookups and metadata writing
   */
  const processSongWithFingerprint = useCallback(async (
    file: MusicFile,
    fingerprint: string | null,
    duration: number | null
  ): Promise<ScanResult> => {
    try {
      if (!fingerprint) {
        await window.electronAPI.cacheMarkFileScanned(file.path, null, false)
        onStatusUpdate?.(file.path, 'scanned-no-match')
        return { success: false, status: 'scanned-no-match', error: 'No fingerprint' }
      }

      // Step 1: Query AcoustID
      updateApiPhase('acoustid')
      await waitForAcoustID()
      const fileDuration = duration || file.metadata?.duration || 0
      const acoustidResult = await lookupFingerprint(fingerprint, fileDuration)

      if (!acoustidResult) {
        await window.electronAPI.cacheMarkFileScanned(file.path, null, false)
        onStatusUpdate?.(file.path, 'scanned-no-match')
        onShowNotification?.(`No match found for "${file.name.replace(/\.[^/.]+$/, '')}"`, 'info')
        return { success: false, status: 'scanned-no-match', error: 'No AcoustID match' }
      }

      // Step 2: Query MusicBrainz
      updateApiPhase('musicbrainz')
      await waitForMusicBrainz()
      const mbData = await lookupRecording(acoustidResult.mbid)

      if (!mbData) {
        await window.electronAPI.cacheMarkFileScanned(file.path, acoustidResult.mbid, false)
        onStatusUpdate?.(file.path, 'scanned-no-match')
        onShowNotification?.(`No metadata found for "${file.name.replace(/\.[^/.]+$/, '')}"`, 'info')
        return { success: false, status: 'scanned-no-match', error: 'No MusicBrainz data' }
      }

      // Extract metadata
      const title = mbData.title
      const artistCredit = mbData['artist-credit']
      const album = pickBestRelease(mbData.releases)

      let fullArtist = ''
      if (artistCredit && artistCredit.length > 0) {
        fullArtist = artistCredit.map((credit: any) => {
          const name = credit.name || credit.artist?.name || ''
          const joinphrase = credit.joinphrase || ''
          return name + joinphrase
        }).join('')
      }

      let year: number | undefined
      if (album?.date) {
        const yearMatch = album.date.match(/^(\d{4})/)
        if (yearMatch) {
          year = parseInt(yearMatch[1], 10)
        }
      }

      // Step 3: Download cover art
      updateApiPhase('coverart')
      let coverArtPath: string | undefined
      const releases = mbData.releases || []

      if (releases.length > 0) {
        const releaseGroupId = (mbData as any)['release-group']?.id
        const coverUrls = getCoverArtUrls(releases, releaseGroupId)

        const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase()
        const filename = `cover_${safeTitle}_${releases[0].id}.jpg`
        const targetPath = `assets/${filename}`

        try {
          await waitForCoverArt()
          const downloadResult = await window.electronAPI.downloadImageWithFallback(coverUrls, targetPath)
          if (downloadResult.success) {
            coverArtPath = targetPath
          }
        } catch (err) {
          // Cover art failed, continue without it
        }
      }

      // Step 4: Write metadata to file
      updateApiPhase('writing')
      const metadataResult = await window.electronAPI.writeMetadata(file.path, {
        title: title,
        artist: fullArtist || mbData['artist-credit']?.[0]?.name,
        album: album?.title,
        year: year,
        coverArtPath: coverArtPath,
      })

      if (metadataResult.success) {
        await window.electronAPI.cacheMarkFileScanned(file.path, acoustidResult.mbid, true)
        onStatusUpdate?.(file.path, 'scanned-tagged')
        onShowNotification?.(`Tagged: "${title}" by ${fullArtist || 'Unknown Artist'}`, 'success')
        return { success: true, status: 'scanned-tagged', title, artist: fullArtist }
      } else {
        await window.electronAPI.cacheMarkFileScanned(file.path, acoustidResult.mbid, false)
        onStatusUpdate?.(file.path, 'scanned-no-match')
        return { success: false, status: 'scanned-no-match', error: 'Failed to write metadata' }
      }
    } catch (error) {
      await window.electronAPI.cacheMarkFileScanned(file.path, null, false)
      onStatusUpdate?.(file.path, 'scanned-no-match')
      return { success: false, status: 'scanned-no-match', error: String(error) }
    }
  }, [onShowNotification, onStatusUpdate])

  /**
   * Scan multiple songs in batch with PARALLEL fingerprinting
   * Phase 1: Generate ALL fingerprints in parallel using worker pool
   * Phase 2: Process API lookups sequentially (rate-limited)
   */
  const scanBatch = useCallback(async (files: MusicFile[]): Promise<void> => {
    if (files.length === 0) {
      onShowNotification?.('No songs to scan', 'info')
      return
    }

    resetFingerprintErrors()
    setIsScanning(true)
    cancelledRef.current = false

    setBatchProgress({
      isScanning: true,
      currentIndex: 0,
      totalCount: files.length,
      currentSongName: 'Generating fingerprints...'
    })

    // Get pool info for logging
    const poolInfo = await window.electronAPI.fingerprintGetPoolInfo()
    onShowNotification?.(
      `Starting parallel fingerprinting with ${poolInfo.workerCount} workers (${poolInfo.cpuCount} CPU cores)`,
      'info'
    )

    // ========== PHASE 1: PARALLEL FINGERPRINTING ==========
    // This uses all CPU cores to fingerprint files simultaneously
    const filePaths = files.map(f => f.path)

    // Set up progress listener for fingerprinting phase
    const cleanupProgress = window.electronAPI.onFingerprintBatchProgress((progress) => {
      setBatchProgress({
        isScanning: true,
        currentIndex: progress.completed,
        totalCount: progress.total,
        currentSongName: `[Worker ${progress.workerId}] ${progress.fileName}`
      })
    })

    let fingerprintResults: Array<{
      filePath: string
      success: boolean
      fingerprint: string | null
      duration: number | null
    }> = []

    try {
      const batchResult = await window.electronAPI.generateFingerprintsBatch(filePaths)

      if (batchResult.success && batchResult.results) {
        fingerprintResults = batchResult.results

        const stats = batchResult.stats!
        onShowNotification?.(
          `Fingerprinting complete: ${stats.successCount}/${stats.totalFiles} in ${(stats.totalTimeMs / 1000).toFixed(1)}s`,
          'success'
        )
      } else {
        onShowNotification?.('Fingerprinting failed', 'error')
        setIsScanning(false)
        setBatchProgress({ isScanning: false, currentIndex: 0, totalCount: 0, currentSongName: '', apiPhase: null })
        cleanupProgress()
        return
      }
    } catch (error) {
      console.error('Batch fingerprinting error:', error)
      onShowNotification?.('Fingerprinting failed: ' + String(error), 'error')
      setIsScanning(false)
      setBatchProgress({ isScanning: false, currentIndex: 0, totalCount: 0, currentSongName: '', apiPhase: null })
      cleanupProgress()
      return
    }

    cleanupProgress()

    if (cancelledRef.current) {
      setIsScanning(false)
      setBatchProgress({ isScanning: false, currentIndex: 0, totalCount: 0, currentSongName: '', apiPhase: null })
      onShowNotification?.('Scan cancelled during fingerprinting', 'info')
      return
    }

    // ========== PHASE 2: SEQUENTIAL API LOOKUPS ==========
    // Now process each file with its pre-generated fingerprint
    let successCount = 0
    let failCount = 0

    for (let i = 0; i < files.length; i++) {
      if (cancelledRef.current) {
        break
      }

      const file = files[i]
      const fingerprintData = fingerprintResults[i]
      const songName = file.metadata?.title || file.name.replace(/\.[^/.]+$/, '')

      setBatchProgress({
        isScanning: true,
        currentIndex: i + 1,
        totalCount: files.length,
        currentSongName: songName,
        apiPhase: 'acoustid' // Will be updated by processSongWithFingerprint
      })

      const result = await processSongWithFingerprint(
        file,
        fingerprintData.fingerprint,
        fingerprintData.duration
      )

      if (result.success) {
        successCount++
        await onUpdateSingleFile?.(file.path)
      } else {
        failCount++
      }

      // Small delay between API calls
      if (i < files.length - 1 && !cancelledRef.current) {
        await waitBetweenSongs()
      }
    }

    setIsScanning(false)
    setBatchProgress({
      isScanning: false,
      currentIndex: 0,
      totalCount: 0,
      currentSongName: '',
      apiPhase: null
    })

    // Show summary notification
    if (!cancelledRef.current) {
      onShowNotification?.(
        `Scan complete: ${successCount} tagged, ${failCount} no match`,
        successCount > 0 ? 'success' : 'info'
      )
    } else {
      onShowNotification?.(
        `Scan cancelled: ${successCount} tagged, ${failCount} no match`,
        'info'
      )
    }
  }, [processSongWithFingerprint, onShowNotification, onUpdateSingleFile])

  /**
   * Cancel ongoing batch scan
   */
  const cancelBatchScan = useCallback(() => {
    cancelledRef.current = true
  }, [])

  return {
    isScanning,
    batchProgress,
    scanSong,
    scanBatch,
    cancelBatchScan
  }
}

