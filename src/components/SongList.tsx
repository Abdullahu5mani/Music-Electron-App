import { useState } from 'react'
import type { MusicFile } from '../../electron/musicScanner'
import type { SortOption } from '../utils/sortMusicFiles'
import { generateFingerprint } from '../utils/fingerprintGenerator'
import { lookupFingerprint } from '../utils/acoustidClient'

interface SongListProps {
  songs: MusicFile[]
  onSongClick: (file: MusicFile, index: number) => void
  playingIndex: number | null
  sortBy: SortOption
  onSortChange: (sortBy: SortOption) => void
}

/**
 * Component for displaying the list of songs
 */
export function SongList({ songs, onSongClick, playingIndex, sortBy, onSortChange }: SongListProps) {
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
      const result = await lookupFingerprint(fingerprint, duration)

      if (result) {
        console.log('=== MBID Received in Component ===')
        console.log('MBID:', result.mbid)
        console.log('Title:', result.title)
        console.log('Artist:', result.artist)
        console.log('==================================')
      } else {
        console.log('No MBID found for this fingerprint')
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

