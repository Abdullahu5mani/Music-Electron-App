import fs from 'node:fs'
import path from 'node:path'
import { parseFile } from 'music-metadata'

// Common music file extensions
const MUSIC_EXTENSIONS = [
  '.mp3',
  '.flac',
  '.wav',
  '.m4a',
  '.aac',
  '.ogg',
  '.opus',
  '.wma',
  '.aiff',
  '.mp4', // Some MP4 files are audio-only
  '.m4p',
  '.amr',
]

export interface MusicFile {
  path: string
  name: string
  extension: string
  size: number
  dateAdded?: number // file mtimeMs for stable added/sort ordering
  metadata?: {
    title?: string
    artist?: string
    album?: string
    albumArtist?: string
    genre?: string[]
    year?: number
    track?: { no: number | null; of: number | null }
    disk?: { no: number | null; of: number | null }
    duration?: number
    albumArt?: string // Base64 encoded album art image
  }
}

/**
 * Scans a directory recursively for music files and extracts metadata
 * @param directoryPath - The path to the directory to scan
 * @returns Array of music file information with metadata
 */
export async function scanMusicFiles(directoryPath: string): Promise<MusicFile[]> {
  const musicFiles: MusicFile[] = []

  try {
    // Check if directory exists
    if (!fs.existsSync(directoryPath)) {
      console.error(`Directory does not exist: ${directoryPath}`)
      return musicFiles
    }

    // Check if it's actually a directory
    const stats = fs.statSync(directoryPath)
    if (!stats.isDirectory()) {
      console.error(`Path is not a directory: ${directoryPath}`)
      return musicFiles
    }

    // Recursively scan directory and extract metadata
    await scanDirectory(directoryPath, musicFiles)

    return musicFiles
  } catch (error) {
    console.error(`Error scanning directory ${directoryPath}:`, error)
    return musicFiles
  }
}

/**
 * Recursively scans a directory for music files and extracts metadata
 */
async function scanDirectory(dirPath: string, musicFiles: MusicFile[]): Promise<void> {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name)

      try {
        if (entry.isDirectory()) {
          // Recursively scan subdirectories
          await scanDirectory(fullPath, musicFiles)
        } else if (entry.isFile()) {
          // Check if file has a music extension
          const ext = path.extname(entry.name).toLowerCase()
          if (MUSIC_EXTENSIONS.includes(ext)) {
            const stats = fs.statSync(fullPath)

            // Extract metadata
            let metadata
            try {
              const parsed = await parseFile(fullPath)

              // Extract album art and convert to base64
              let albumArt: string | undefined
              if (parsed.common.picture && parsed.common.picture.length > 0) {
                // Get the first picture (usually the album cover)
                const picture = parsed.common.picture[0]
                // Convert Buffer/Uint8Array to base64 string
                const buffer = Buffer.from(picture.data)
                albumArt = `data:${picture.format};base64,${buffer.toString('base64')}`
              }

              metadata = {
                title: parsed.common.title,
                artist: parsed.common.artist,
                album: parsed.common.album,
                albumArtist: parsed.common.albumartist,
                genre: parsed.common.genre,
                year: parsed.common.year,
                track: parsed.common.track,
                disk: parsed.common.disk,
                duration: parsed.format.duration,
                albumArt,
              }
            } catch (error) {
              // If metadata extraction fails, continue without metadata
              console.warn(`Could not extract metadata for ${entry.name}:`, error)
            }

            musicFiles.push({
              path: fullPath,
              name: entry.name,
              extension: ext,
              size: stats.size,
              dateAdded: stats.mtimeMs,
              metadata,
            })
          }
        }
      } catch (error) {
        // Skip files/directories that can't be accessed (permissions, etc.)
        console.warn(`Skipping ${fullPath}:`, error)
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error)
  }
}

/**
 * Formats file size to human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

/**
 * Formats duration in seconds to MM:SS format
 */
function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

/**
 * Formats music file metadata into a readable string
 * @param file - The music file with metadata
 * @returns Formatted metadata string or null if no metadata
 */
export function formatMusicMetadata(file: MusicFile): string | null {
  if (!file.metadata) {
    return null
  }

  const metadataParts: string[] = []

  if (file.metadata.title) {
    metadataParts.push(`Title: ${file.metadata.title}`)
  }
  if (file.metadata.artist) {
    metadataParts.push(`Artist: ${file.metadata.artist}`)
  }
  if (file.metadata.album) {
    metadataParts.push(`Album: ${file.metadata.album}`)
  }
  if (file.metadata.albumArtist) {
    metadataParts.push(`Album Artist: ${file.metadata.albumArtist}`)
  }
  if (file.metadata.genre && file.metadata.genre.length > 0) {
    metadataParts.push(`Genre: ${file.metadata.genre.join(', ')}`)
  }
  if (file.metadata.year) {
    metadataParts.push(`Year: ${file.metadata.year}`)
  }
  if (file.metadata.track && file.metadata.track.no !== null) {
    const trackInfo = file.metadata.track.of
      ? `${file.metadata.track.no}/${file.metadata.track.of}`
      : `${file.metadata.track.no}`
    metadataParts.push(`Track: ${trackInfo}`)
  }
  if (file.metadata.duration) {
    metadataParts.push(`Duration: ${formatDuration(file.metadata.duration)}`)
  }

  return metadataParts.length > 0 ? metadataParts.join(' | ') : null
}

/**
 * Scans a directory for music files and logs the results to console
 * @param directoryPath - The path to the directory to scan
 */
/**
 * Reads metadata for a single music file
 * @param filePath - The path to the music file
 * @returns Updated MusicFile object with fresh metadata
 */
export async function readSingleFileMetadata(filePath: string): Promise<MusicFile | null> {
  try {
    if (!fs.existsSync(filePath)) {
      console.error(`File does not exist: ${filePath}`)
      return null
    }

    const stats = fs.statSync(filePath)
    const ext = path.extname(filePath).toLowerCase()
    const name = path.basename(filePath)

    if (!MUSIC_EXTENSIONS.includes(ext)) {
      console.error(`Not a supported music file: ${filePath}`)
      return null
    }

    // Extract metadata
    let metadata
    try {
      const parsed = await parseFile(filePath)

      // Extract album art and convert to base64
      let albumArt: string | undefined
      if (parsed.common.picture && parsed.common.picture.length > 0) {
        const picture = parsed.common.picture[0]
        const buffer = Buffer.from(picture.data)
        albumArt = `data:${picture.format};base64,${buffer.toString('base64')}`
      }

      metadata = {
        title: parsed.common.title,
        artist: parsed.common.artist,
        album: parsed.common.album,
        albumArtist: parsed.common.albumartist,
        genre: parsed.common.genre,
        year: parsed.common.year,
        track: parsed.common.track,
        disk: parsed.common.disk,
        duration: parsed.format.duration,
        albumArt,
      }
    } catch (error) {
      console.warn(`Could not extract metadata for ${name}:`, error)
    }

    return {
      path: filePath,
      name,
      extension: ext,
      size: stats.size,
      dateAdded: stats.mtimeMs,
      metadata,
    }
  } catch (error) {
    console.error(`Error reading file metadata ${filePath}:`, error)
    return null
  }
}

export async function scanAndLogMusicFiles(directoryPath: string): Promise<MusicFile[]> {
  console.log('Starting music scan...')
  console.log(`Scanning folder: ${directoryPath}`)
  console.log('-'.repeat(50))

  const musicFiles = await scanMusicFiles(directoryPath)

  console.log(`\nFound ${musicFiles.length} music file(s)\n`)

  if (musicFiles.length > 0) {
    console.log('Music Files:')
    console.log('-'.repeat(50))
    musicFiles.forEach((file, index) => {
      console.log(`${index + 1}. ${file.name}`)
      console.log(`   Path: ${file.path}`)
      console.log(`   Size: ${formatFileSize(file.size)}`)
      console.log(`   Type: ${file.extension}`)

      const metadataString = formatMusicMetadata(file)
      if (metadataString) {
        console.log(`   [Music Metadata: ${metadataString}]`)
      } else {
        console.log(`   [Music Metadata: No metadata available]`)
      }

      console.log('')
    })
  } else {
    console.log('No music files found in the specified directory.')
  }

  console.log('-'.repeat(50))

  return musicFiles
}

