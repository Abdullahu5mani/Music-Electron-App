import { useState } from 'react'
import type { MusicFile } from '../../electron/musicScanner'
import type { SortOption } from '../utils/sortMusicFiles'
import { generateFingerprint } from '../utils/fingerprintGenerator'
import { lookupFingerprint } from '../utils/acoustidClient'
import { lookupRecording, getCoverArtUrl } from '../utils/musicbrainzClient'

interface SongListProps {
  songs: MusicFile[]
  onSongClick: (file: MusicFile, index: number) => void
  playingIndex: number | null
  sortBy: SortOption
  onSortChange: (sortBy: SortOption) => void
  onRefreshLibrary?: () => void
}

/**
 * Component for displaying the list of songs
 */
export function SongList({ songs, onSongClick, playingIndex, sortBy, onSortChange, onRefreshLibrary }: SongListProps) {
  const [generatingFingerprint, setGeneratingFingerprint] = useState<string | null>(null)

  const handleGenerateFingerprint = async (e: React.MouseEvent, file: MusicFile) => {
    e.stopPropagation() // Prevent song click

    if (generatingFingerprint === file.path) {
      return // Already generating
    }

    setGeneratingFingerprint(file.path)
    console.log('=== Generating Fingerprint ===')
    console.log('File:', file.name)
    console.log('Path:', file.path)

    try {
      // Step 1: Generate fingerprint
      const fingerprint = await generateFingerprint(file.path)

      if (!fingerprint) {
        console.error('Failed to generate fingerprint')
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
          console.log('Title:', mbData.title)
          console.log('Artist:', mbData['artist-credit']?.[0]?.name)
          const album = mbData.releases?.[0]
          console.log('Album:', album?.title)

          if (album) {
            const coverUrl = getCoverArtUrl(album.id)
            console.log('Cover Art URL (250px):', coverUrl)

            // Generate a filename for the cover art
            const safeTitle = mbData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()
            const filename = `cover_${safeTitle}_${album.id}.jpg`

            try {
              // Request download to assets folder (main process resolves path to userData/assets)
              console.log('Attempting to download cover art to assets...')
              const targetPath = `assets/${filename}`

              // 1. Download the image
              const downloadResult = await window.electronAPI.downloadImage(coverUrl, targetPath)
              if (downloadResult.success) {
                console.log(`Cover art saved to ${targetPath}`)

                // 2. Embed the image into the audio file
                console.log('Embedding cover art...')
                const embedResult = await window.electronAPI.writeCoverArt(file.path, targetPath)

                if (embedResult.success) {
                  console.log('Cover art embedded successfully!')
                  // Refresh library to show updated cover art
                  if (onRefreshLibrary) {
                    console.log('Refreshing library...')
                    onRefreshLibrary()
                  }
                } else {
                  console.error('Failed to embed cover art:', embedResult.error)
                }
              } else {
                console.error('Failed to download cover art:', downloadResult.error)
              }
            } catch (err) {
              console.error('Failed to download cover art:', err)
            }
          }

          console.log('Full Data:', mbData)
          console.log('============================')
        }
      } else {
        console.log('No match found for this fingerprint')
      }
    } catch (error) {
      console.error('Error generating fingerprint:', error)
    } finally {
      setGeneratingFingerprint(null)
    }
  }

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
      <ul className="song-list">
        {songs.map((file, index) => (
          <li
            key={index}
            className={`song-item ${playingIndex === index ? 'playing' : ''}`}
            onClick={() => onSongClick(file, index)}
          >
            <div className="song-content">
              {file.metadata?.albumArt ? (
                <div className="album-art-container">
                  <img
                    src={file.metadata.albumArt}
                    alt={`${file.metadata.album || file.name} cover`}
                    className="album-art"
                  />
                </div>
              ) : (
                <div className="album-art-container no-art">
                  <span>🎵</span>
                </div>
              )}
              <div className="song-info">
                <div className="song-title-row">
                  <div className="song-title">
                    {file.metadata?.title || file.name}
                  </div>
                  <button
                    className="fingerprint-button"
                    onClick={(e) => handleGenerateFingerprint(e, file)}
                    disabled={generatingFingerprint === file.path}
                    title="Generate fingerprint (check console)"
                  >
                    {generatingFingerprint === file.path ? '⏳' : '🔍'}
                  </button>
                </div>
                <div className="song-artist">
                  {file.metadata?.artist || 'Unknown Artist'}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
