import type { MusicFile } from '../../electron/musicScanner'

export type SortOption = 'title' | 'artist' | 'track' | 'dateAdded'

/**
 * Sorts music files based on the selected sort option
 */
export function sortMusicFiles(files: MusicFile[], sortBy: SortOption): MusicFile[] {
  const sorted = [...files] // Create a copy to avoid mutating the original array

  switch (sortBy) {
    case 'title':
      return sorted.sort((a, b) => {
        const titleA = (a.metadata?.title || a.name).toLowerCase()
        const titleB = (b.metadata?.title || b.name).toLowerCase()
        return titleA.localeCompare(titleB)
      })

    case 'artist':
      return sorted.sort((a, b) => {
        const artistA = (a.metadata?.artist || 'Unknown Artist').toLowerCase()
        const artistB = (b.metadata?.artist || 'Unknown Artist').toLowerCase()
        // If artists are the same, sort by title
        if (artistA === artistB) {
          const titleA = (a.metadata?.title || a.name).toLowerCase()
          const titleB = (b.metadata?.title || b.name).toLowerCase()
          return titleA.localeCompare(titleB)
        }
        return artistA.localeCompare(artistB)
      })

    case 'track':
      return sorted.sort((a, b) => {
        // Sort by album first, then by track number
        const albumA = (a.metadata?.album || '').toLowerCase()
        const albumB = (b.metadata?.album || '').toLowerCase()
        
        if (albumA !== albumB) {
          return albumA.localeCompare(albumB)
        }

        // Same album, sort by track number
        const trackA = a.metadata?.track?.no ?? Infinity
        const trackB = b.metadata?.track?.no ?? Infinity

        if (trackA === Infinity && trackB === Infinity) {
          // Both missing track numbers, sort by title
          const titleA = (a.metadata?.title || a.name).toLowerCase()
          const titleB = (b.metadata?.title || b.name).toLowerCase()
          return titleA.localeCompare(titleB)
        }

        return trackA - trackB
      })

    case 'dateAdded':
      return sorted.sort((a, b) => {
        // Sort by dateAdded timestamp (newest first)
        const dateA = (a as any).dateAdded || 0
        const dateB = (b as any).dateAdded || 0
        return dateB - dateA // Descending order (newest first)
      })

    default:
      return sorted
  }
}











