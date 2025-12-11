import { useState, useCallback, useRef } from 'react'
import type { MusicFile } from '../../electron/musicScanner'
import type { ScanStatusType } from '../electron.d'
import { generateFingerprint, resetFingerprintErrors } from '../utils/fingerprintGenerator'
import { lookupFingerprint } from '../utils/acoustidClient'
import { lookupRecording, getCoverArtUrls, pickBestRelease } from '../utils/musicbrainzClient'
import { waitForAcoustID, waitForMusicBrainz, waitForCoverArt, waitBetweenSongs } from '../utils/rateLimiter'

export interface ScanResult {
  success: boolean
  status: ScanStatusType
  title?: string
  artist?: string
  error?: string
}

export interface BatchScanProgress {
  isScanning: boolean
  currentIndex: number
  totalCount: number
  currentSongName: string
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
    currentSongName: ''
  })

  const cancelledRef = useRef(false)

  /**
   * Scan a single song with rate limiting
   */
  const scanSong = useCallback(async (file: MusicFile): Promise<ScanResult> => {
    console.log('=== Scanning Song ===')
    console.log('File:', file.name)
    console.log('Path:', file.path)

    try {
      // Step 1: Generate fingerprint (local, no rate limit needed)
      const fingerprint = await generateFingerprint(file.path)

      if (!fingerprint) {
        console.error('Failed to generate fingerprint')
        await window.electronAPI.cacheMarkFileScanned(file.path, null, false)
        onStatusUpdate?.(file.path, 'scanned-no-match')
        return { success: false, status: 'scanned-no-match', error: 'Failed to generate fingerprint' }
      }

      // Step 2: Wait for rate limit, then query AcoustID
      await waitForAcoustID()
      const duration = file.metadata?.duration || 0
      const acoustidResult = await lookupFingerprint(fingerprint, duration)

      if (!acoustidResult) {
        console.log('No AcoustID match found')
        await window.electronAPI.cacheMarkFileScanned(file.path, null, false)
        onStatusUpdate?.(file.path, 'scanned-no-match')
        onShowNotification?.(`No match found for "${file.name.replace(/\.[^/.]+$/, '')}"`, 'info')
        return { success: false, status: 'scanned-no-match', error: 'No AcoustID match' }
      }

      console.log('AcoustID match found:', acoustidResult.mbid)

      // Step 3: Wait for rate limit, then query MusicBrainz
      await waitForMusicBrainz()
      const mbData = await lookupRecording(acoustidResult.mbid)

      if (!mbData) {
        console.log('No MusicBrainz data found')
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
   * Scan multiple songs in batch with progress tracking
   */
  const scanBatch = useCallback(async (files: MusicFile[]): Promise<void> => {
    if (files.length === 0) {
      onShowNotification?.('No songs to scan', 'info')
      return
    }

    // Reset fingerprint error counter at start of batch
    resetFingerprintErrors()

    setIsScanning(true)
    cancelledRef.current = false

    setBatchProgress({
      isScanning: true,
      currentIndex: 0,
      totalCount: files.length,
      currentSongName: ''
    })

    // Show warning for large batches about WASM memory limitations
    if (files.length > 50) {
      onShowNotification?.(
        `Scanning ${files.length} files. Large batches may need app restart if memory errors occur.`,
        'info'
      )
    }

    let successCount = 0
    let failCount = 0

    for (let i = 0; i < files.length; i++) {
      if (cancelledRef.current) {
        console.log('Batch scan cancelled')
        break
      }

      const file = files[i]
      const songName = file.metadata?.title || file.name.replace(/\.[^/.]+$/, '')

      setBatchProgress({
        isScanning: true,
        currentIndex: i + 1,
        totalCount: files.length,
        currentSongName: songName
      })

      const result = await scanSong(file)

      if (result.success) {
        successCount++
        // Update this file's metadata in-place after successful tag
        await onUpdateSingleFile?.(file.path)
      } else {
        failCount++
      }

      // Small delay between songs
      if (i < files.length - 1 && !cancelledRef.current) {
        await waitBetweenSongs()
      }
    }

    setIsScanning(false)
    setBatchProgress({
      isScanning: false,
      currentIndex: 0,
      totalCount: 0,
      currentSongName: ''
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
  }, [scanSong, onShowNotification, onUpdateSingleFile])

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

