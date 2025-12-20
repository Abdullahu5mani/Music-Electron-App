import { useState, useEffect, useRef, useCallback } from 'react'
import type { MusicFile } from '../../../../electron/musicScanner'
import type { SortOption } from '../../../utils/sortMusicFiles'
import type { ScanStatusType, Playlist } from '../../../types/electron.d'
import { generateFingerprint } from '../../../services/fingerprint'
import { lookupFingerprint } from '../../../services/acoustid'
import { lookupRecording, getCoverArtUrls, pickBestRelease } from '../../../services/musicbrainz'
import { ContextMenu, type ContextMenuItem } from '../../common/ContextMenu/ContextMenu'
import musicNoteIcon from '../../../assets/icons/music-note.svg'
import playIcon from '../../../assets/icons/play.svg'
import pauseIcon from '../../../assets/icons/pause.svg'
import refreshIcon from '../../../assets/icons/refresh.svg'
import editIcon from '../../../assets/icons/edit.svg'
import playlistAddIcon from '../../../assets/icons/playlist-add.svg'
import plusIcon from '../../../assets/icons/plus.svg'
import microphoneIcon from '../../../assets/icons/microphone.svg'

interface SongListProps {
  songs: MusicFile[]
  onSongClick: (file: MusicFile, index: number) => void
  playingIndex: number | null
  sortBy: SortOption
  onSortChange: (sortBy: SortOption) => void
  onUpdateSingleFile?: (filePath: string) => Promise<MusicFile | null>
  onShowNotification?: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void
  isPlaying?: boolean
  onPlayPause?: () => void
  // Playlist props
  playlists?: Playlist[]
  onAddToPlaylist?: (playlistId: number, filePaths: string[]) => Promise<boolean>
  onCreatePlaylistWithSongs?: (filePaths: string[]) => void
  // Lyrics props
  onProcessLyrics?: (filePath: string, songName: string) => void
}

/**
 * Component for displaying the list of songs
 */
export function SongList({
  songs,
  onSongClick,
  playingIndex,
  sortBy,
  onSortChange,
  onUpdateSingleFile,
  onShowNotification,
  isPlaying,
  onPlayPause,
  playlists = [],
  onAddToPlaylist,
  onCreatePlaylistWithSongs,
  onProcessLyrics
}: SongListProps) {
  const [generatingFingerprint, setGeneratingFingerprint] = useState<string | null>(null)
  const [scanStatuses, setScanStatuses] = useState<Record<string, ScanStatusType>>({})
  const [loadingStatuses, setLoadingStatuses] = useState(false)

  // Track recently updated songs for glow animation (using ref + forceUpdate to minimize re-renders)
  const recentlyUpdatedRef = useRef<Set<string>>(new Set())
  const [, forceUpdate] = useState(0)

  // FLIP Animation: Store positions before update for smooth transitions
  const positionCache = useRef<Map<string, DOMRect>>(new Map())
  const pendingFlip = useRef<string | null>(null)

  // Store old metadata during animation - using REF to avoid extra re-renders
  // The display update happens when songs array changes, not when this cache changes
  const oldMetadataCacheRef = useRef<Map<string, {
    title?: string
    artist?: string
    albumArt?: string
  }>>(new Map())

  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    songIndex: number
  } | null>(null)

  // Refs for each song item (keyed by file path for stability)
  const songRefs = useRef<Map<string, HTMLLIElement>>(new Map())

  // Callback to set ref for each song item
  const setSongRef = useCallback((filePath: string, element: HTMLLIElement | null) => {
    if (element) {
      songRefs.current.set(filePath, element)
    } else {
      songRefs.current.delete(filePath)
    }
  }, [])

  // Track previous playing index to avoid scrolling when songs update
  const prevPlayingIndexRef = useRef<number | null>(null)

  // Auto-scroll to the currently playing song when playingIndex changes (not on songs update)
  useEffect(() => {
    // Only scroll if playingIndex actually changed (not just songs array)
    if (playingIndex === prevPlayingIndexRef.current) {
      return
    }
    prevPlayingIndexRef.current = playingIndex

    if (playingIndex !== null && playingIndex >= 0 && songs[playingIndex]) {
      const filePath = songs[playingIndex].path
      const element = songRefs.current.get(filePath)
      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center' // Center the song in the viewport
        })
      }
    }
  }, [playingIndex, songs])

  // FLIP Animation: After songs list updates, animate items that moved
  useEffect(() => {
    const flipPath = pendingFlip.current
    if (!flipPath) return

    const element = songRefs.current.get(flipPath)
    const oldRect = positionCache.current.get(flipPath)

    if (element && oldRect) {
      const newRect = element.getBoundingClientRect()
      const deltaY = oldRect.top - newRect.top

      if (Math.abs(deltaY) > 10) {
        // Apply inverse transform to make it appear in old position
        element.style.transform = `translateY(${deltaY}px)`
        element.style.transition = 'none'

        // Force reflow
        element.offsetHeight

        // Animate to new position
        element.style.transition = 'transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        element.style.transform = 'translateY(0)'

        // Clean up after animation
        setTimeout(() => {
          element.style.transition = ''
          element.style.transform = ''
        }, 650)
      }
    }

    // Clear the pending flip
    pendingFlip.current = null
    positionCache.current.clear()
  }, [songs])

  // Load scan statuses for all songs when the list changes
  useEffect(() => {
    const loadScanStatuses = async () => {
      if (songs.length === 0) {
        setScanStatuses({})
        return
      }

      setLoadingStatuses(true)
      try {
        const filePaths = songs.map(song => song.path)
        const statuses = await window.electronAPI.cacheGetBatchStatus(filePaths)
        setScanStatuses(statuses)
      } catch (error) {
        console.error('Error loading scan statuses:', error)
      } finally {
        setLoadingStatuses(false)
      }
    }

    loadScanStatuses()
  }, [songs])

  const handleGenerateFingerprint = async (e: React.MouseEvent, file: MusicFile) => {
    e.stopPropagation() // Prevent song click

    if (generatingFingerprint === file.path) {
      return // Already generating
    }

    // Check current scan status
    const currentStatus = scanStatuses[file.path]

    // If already scanned and tagged, show message and skip
    if (currentStatus === 'scanned-tagged') {
      console.log('File already scanned and tagged:', file.name)
      return
    }

    // If scanned but no match found, allow rescan but inform user
    if (currentStatus === 'scanned-no-match') {
      console.log('File was previously scanned with no match. Rescanning:', file.name)
    }

    setGeneratingFingerprint(file.path)
    onShowNotification?.(`Identifying "${file.name}"...`, 'info')
    console.log('=== Generating Fingerprint ===')
    console.log('File:', file.name)
    console.log('Path:', file.path)

    try {
      // Step 1: Generate fingerprint
      const fingerprint = await generateFingerprint(file.path)

      if (!fingerprint) {
        console.error('Failed to generate fingerprint')
        // Mark as scanned but no metadata
        await window.electronAPI.cacheMarkFileScanned(file.path, null, false)
        setScanStatuses(prev => ({ ...prev, [file.path]: 'scanned-no-match' }))
        return
      }

      console.log('=== Fingerprint Generated ===')
      console.log('Fingerprint ID:', fingerprint)
      console.log('Length:', fingerprint.length)
      console.log('============================')

      // Step 2: Get audio duration (needed for AcoustID lookup)
      const duration = file.metadata?.duration || 0

      if (duration === 0) {
        console.warn('Duration not available, AcoustID lookup may be less accurate')
      }

      // Step 3: Query AcoustID API
      const acoustidResult = await lookupFingerprint(fingerprint, duration)

      if (acoustidResult) {
        console.log('=== AcoustID Match Found ===')
        console.log('MBID:', acoustidResult.mbid)

        // Step 4: Query MusicBrainz API
        const mbData = await lookupRecording(acoustidResult.mbid)

        if (mbData) {
          console.log('=== MusicBrainz Metadata ===')

          // Extract all relevant metadata
          const title = mbData.title
          const artist = mbData['artist-credit']?.[0]?.name
          const artistCredit = mbData['artist-credit']
          // Pick the best release (prioritizes original albums over compilations/soundtracks)
          const album = pickBestRelease(mbData.releases)

          console.log('Title:', title)
          console.log('Artist:', artist)
          console.log('Album:', album?.title)
          console.log('Release Date:', album?.date)

          // Build the full artist string (handles "feat." and multiple artists)
          let fullArtist = ''
          if (artistCredit && artistCredit.length > 0) {
            fullArtist = artistCredit.map((credit: any) => {
              const name = credit.name || credit.artist?.name || ''
              const joinphrase = credit.joinphrase || ''
              return name + joinphrase
            }).join('')
          }

          // Extract year from release date (format: "YYYY-MM-DD" or "YYYY")
          let year: number | undefined
          if (album?.date) {
            const yearMatch = album.date.match(/^(\d{4})/)
            if (yearMatch) {
              year = parseInt(yearMatch[1], 10)
            }
          }

          // Prepare cover art URLs with fallback (tries multiple URLs if one returns 404)
          let coverArtPath: string | undefined
          const releases = mbData.releases || []

          if (releases.length > 0) {
            // Get release group ID if available (for fallback)
            // Try from top-level first, then from the best release
            let releaseGroupId = (mbData as any)['release-group']?.id
            if (!releaseGroupId && releases.length > 0) {
              // Extract from the first release (which is usually the best one after pickBestRelease)
              releaseGroupId = releases[0]['release-group']?.id
            }

            // Generate all possible cover art URLs to try
            const coverUrls = getCoverArtUrls(releases, releaseGroupId)
            console.log(`Trying ${coverUrls.length} cover art URLs with fallback...`)
            if (releaseGroupId) {
              console.log(`Release Group ID: ${releaseGroupId}`)
            }

            // Generate a filename for the cover art
            const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase()
            const filename = `cover_${safeTitle}_${releases[0].id}.jpg`
            const targetPath = `assets/${filename}`

            try {
              // Download the cover art with fallback (tries each URL until one succeeds)
              console.log('Downloading cover art with fallback...')
              const downloadResult = await window.electronAPI.downloadImageWithFallback(coverUrls, targetPath)
              if (downloadResult.success) {
                console.log(`Cover art saved from: ${downloadResult.url}`)
                coverArtPath = targetPath
              } else {
                console.warn('All cover art URLs failed:', downloadResult.error)
                console.warn(`Tried ${coverUrls.length} URLs:`, coverUrls.slice(0, 5).map(url => url.split('/').pop()).join(', '), coverUrls.length > 5 ? '...' : '')
                // Show notification that cover art couldn't be found
                onShowNotification?.(`No cover art found for "${title}"`, 'warning')
              }
            } catch (err) {
              console.warn('Failed to download cover art:', err)
              onShowNotification?.('Failed to download cover art', 'warning')
            }
          }

          // Write all metadata to the file at once
          console.log('Writing metadata to file...')

          // Tell file watcher to ignore this file (prevents triggering rescan)
          await window.electronAPI.fileWatcherIgnore(file.path)

          const metadataResult = await window.electronAPI.writeMetadata(file.path, {
            title: title,
            artist: fullArtist || artist,
            album: album?.title,
            year: year,
            coverArtPath: coverArtPath,
          })

          if (metadataResult.success) {
            console.log('Metadata written successfully!')

            // Mark as scanned with metadata in cache
            await window.electronAPI.cacheMarkFileScanned(file.path, acoustidResult.mbid, true)
            setScanStatuses(prev => ({ ...prev, [file.path]: 'scanned-tagged' }))

            // Show success notification
            onShowNotification?.(`Tagged: "${title}" by ${fullArtist || artist}`, 'success')

            // Update just this file's metadata in-place (no full library refresh)
            if (onUpdateSingleFile) {
              console.log('Updating single file metadata in-place...')
              const filePath = file.path

              // Step 1: Cache OLD metadata to display during animation (using ref - no re-render)
              oldMetadataCacheRef.current.set(filePath, {
                title: file.metadata?.title || file.name.replace(/\.[^/.]+$/, ''),
                artist: file.metadata?.artist || 'Unknown Artist',
                albumArt: file.metadata?.albumArt
              })

              // Step 2: Capture position BEFORE update for FLIP animation
              const element = songRefs.current.get(filePath)
              if (element) {
                positionCache.current.set(filePath, element.getBoundingClientRect())
                pendingFlip.current = filePath
              }

              // Step 3: Update the file (this triggers ONE re-render with new sorted position)
              await onUpdateSingleFile(filePath)

              // Step 4: After FLIP animation completes, do scroll + reveal in ONE update
              setTimeout(() => {
                // Scroll to the item so user can see it
                const updatedElement = songRefs.current.get(filePath)
                if (updatedElement) {
                  updatedElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                  })
                }

                // Step 5: After scroll settles, reveal new data and show glow (ONE re-render)
                setTimeout(() => {
                  // Clear the cached old metadata (ref update - no re-render)
                  oldMetadataCacheRef.current.delete(filePath)

                  // Add glow effect (ref update - no re-render yet)
                  recentlyUpdatedRef.current.add(filePath)

                  // Trigger ONE re-render to show new metadata + glow
                  forceUpdate(n => n + 1)

                  // Clear the glow animation after it completes (ONE more re-render)
                  setTimeout(() => {
                    recentlyUpdatedRef.current.delete(filePath)
                    forceUpdate(n => n + 1)
                  }, 1500)
                }, 1500)  // Reduced from 2000ms - scroll doesn't take that long
              }, 650)  // Slightly reduced to match animation end better
            }
          } else {
            console.error('Failed to write metadata:', metadataResult.error)
            // Mark as scanned but no metadata written (error occurred)
            await window.electronAPI.cacheMarkFileScanned(file.path, acoustidResult.mbid, false)
            setScanStatuses(prev => ({ ...prev, [file.path]: 'scanned-no-match' }))
            onShowNotification?.(`Failed to write metadata to "${file.name}"`, 'error')
          }

          console.log('Full Data:', mbData)
          console.log('============================')
        } else {
          // MusicBrainz lookup failed
          console.log('MusicBrainz lookup returned no data')
          await window.electronAPI.cacheMarkFileScanned(file.path, acoustidResult.mbid, false)
          setScanStatuses(prev => ({ ...prev, [file.path]: 'scanned-no-match' }))
          onShowNotification?.(`No metadata found for "${file.name}"`, 'error')
        }
      } else {
        console.log('No match found for this fingerprint')
        // Mark as scanned but no match
        await window.electronAPI.cacheMarkFileScanned(file.path, null, false)
        setScanStatuses(prev => ({ ...prev, [file.path]: 'scanned-no-match' }))
        onShowNotification?.(`No match found for "${file.name}"`, 'error')
      }
    } catch (error) {
      console.error('Error generating fingerprint:', error)
      // Mark as scanned but failed
      await window.electronAPI.cacheMarkFileScanned(file.path, null, false)
      onShowNotification?.(`Scan failed for "${file.name}"`, 'error')
      setScanStatuses(prev => ({ ...prev, [file.path]: 'scanned-no-match' }))
    } finally {
      setGeneratingFingerprint(null)
    }
  }

  /**
   * Get the display icon/button for a song based on its scan status
   */


  if (songs.length === 0) {
    return (
      <div className="music-list">
        <h2>Music Files (0)</h2>
        <p>No music files found. Select a folder to scan.</p>
      </div>
    )
  }

  return (
    <div className="music-list">
      <div className="music-list-header">
        <h2>Music Files ({songs.length})</h2>
        <div className="sort-controls">
          <label htmlFor="sort-select">Sort by:</label>
          <select
            id="sort-select"
            className="sort-select"
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
          >
            <option value="title">Title</option>
            <option value="artist">Artist</option>
            <option value="track">Track Number</option>
            <option value="dateAdded">Date Added</option>
          </select>
        </div>
      </div>
      {loadingStatuses && (
        <div className="loading-statuses">Loading scan statuses...</div>
      )}
      <ul className="song-list">
        {songs.map((file, index) => (
          <li
            key={file.path}
            ref={(el) => setSongRef(file.path, el)}
            className={`song-item ${playingIndex === index ? 'playing' : ''} ${recentlyUpdatedRef.current.has(file.path) ? 'metadata-updated' : ''}`}
            onClick={() => onSongClick(file, index)}
            onContextMenu={(e) => {
              e.preventDefault()
              setContextMenu({ x: e.clientX, y: e.clientY, songIndex: index })
            }}
          >
            <div className="song-content">
              {(() => {
                // Use cached old metadata during animation, or current metadata
                // Check if cache HAS this file (not just if values exist) - so old art stays old
                const hasCachedMeta = oldMetadataCacheRef.current.has(file.path)
                const cachedMeta = oldMetadataCacheRef.current.get(file.path)

                const displayTitle = hasCachedMeta
                  ? (cachedMeta?.title || file.name.replace(/\.[^/.]+$/, ''))
                  : (file.metadata?.title || file.name.replace(/\.[^/.]+$/, ''))
                const displayArtist = hasCachedMeta
                  ? (cachedMeta?.artist || 'Unknown Artist')
                  : (file.metadata?.artist || 'Unknown Artist')
                const displayArt = hasCachedMeta
                  ? cachedMeta?.albumArt  // Use cached art (even if undefined)
                  : file.metadata?.albumArt

                return (
                  <>
                    {displayArt ? (
                      <div className="album-art-container">
                        <img
                          src={displayArt}
                          alt={`${file.metadata?.album || file.name} cover`}
                          className="album-art"
                        />
                      </div>
                    ) : (
                      <div className="album-art-container no-art">
                        <img src={musicNoteIcon} alt="" className="album-art-placeholder" />
                      </div>
                    )}
                    <div className="song-info">
                      <div className="song-title-row">
                        <div className="song-title">
                          {displayTitle}
                        </div>
                      </div>
                      <div className="song-artist">
                        {displayArtist}
                      </div>
                    </div>
                  </>
                )
              })()}
            </div>
          </li>
        ))}
      </ul>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          items={(() => {
            const items: ContextMenuItem[] = []
            const isThisSongPlaying = contextMenu.songIndex === playingIndex
            const currentSong = songs[contextMenu.songIndex]

            if (isThisSongPlaying && onPlayPause) {
              // This song is playing - show pause/play toggle
              items.push({
                label: isPlaying ? 'Pause' : 'Resume',
                icon: isPlaying ? pauseIcon : playIcon,
                onClick: onPlayPause
              })
            } else {
              // Different song - show play option
              items.push({
                label: 'Play',
                icon: playIcon,
                onClick: () => onSongClick(currentSong, contextMenu.songIndex)
              })
            }

            // Add divider before playlist options
            if (playlists.length > 0 || onCreatePlaylistWithSongs) {
              items.push({ label: '', icon: '', onClick: () => { }, divider: true })
            }

            // Add Identify Song option
            const currentStatus = scanStatuses[currentSong.path]
            const isScanningSong = generatingFingerprint === currentSong.path

            if (!isScanningSong && currentStatus !== 'scanned-tagged') {
              items.push({
                label: currentStatus === 'scanned-no-match' ? 'Retry Identification' : 'Identify Song',
                icon: refreshIcon,
                onClick: () => {
                  // Mock event for handleGenerateFingerprint
                  handleGenerateFingerprint({ stopPropagation: () => { } } as any, currentSong)
                }
              })
            }

            // Add to existing playlists
            if (playlists.length > 0 && onAddToPlaylist) {
              playlists.slice(0, 5).forEach(playlist => {
                items.push({
                  label: `Add to "${playlist.name}"`,
                  icon: editIcon,
                  onClick: () => onAddToPlaylist(playlist.id, [currentSong.path])
                })
              })

              if (playlists.length > 5) {
                items.push({
                  label: `... and ${playlists.length - 5} more playlists`,
                  icon: playlistAddIcon,
                  onClick: () => { },
                  disabled: true
                })
              }
            }

            // Create new playlist with this song
            if (onCreatePlaylistWithSongs) {
              items.push({
                label: 'Create playlist with song',
                icon: plusIcon,
                onClick: () => onCreatePlaylistWithSongs([currentSong.path])
              })
            }

            // Add Lyrics option
            if (onProcessLyrics) {
              items.push({
                label: 'Lyrics',
                icon: microphoneIcon,
                onClick: () => {
                  const songName = currentSong.metadata?.title || currentSong.name
                  onProcessLyrics(currentSong.path, songName)
                }
              })
            }

            return items
          })()}
        />
      )}
    </div>
  )
}
