import { ipcMain, app } from 'electron'
import path from 'path'
import fs from 'fs'
import fsPromises from 'fs/promises'
import axios from 'axios'
import { getUsedAssetPaths } from '../../metadataCache'

function getAssetsDir() {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, 'assets')
}

function cleanupOldAssets(maxAgeDays = 30) {
  try {
    const assetsDir = getAssetsDir()
    if (!fs.existsSync(assetsDir)) return

    const entries = fs.readdirSync(assetsDir, { withFileTypes: true })
    const now = Date.now()
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000

    for (const entry of entries) {
      const fullPath = path.join(assetsDir, entry.name)
      try {
        const stat = fs.statSync(fullPath)
        if (now - stat.mtimeMs > maxAgeMs) {
          fs.unlinkSync(fullPath)
          console.log('Removed old asset:', fullPath)
        }
      } catch (err) {
        console.warn('Failed to inspect/remove asset:', fullPath, err)
      }
    }
  } catch (err) {
    console.warn('Asset cleanup skipped:', err)
  }
}

/**
 * Runs garbage collection on the assets folder.
 * Deletes any file in `userData/assets` that is not referenced by `metadata_cache`.
 *
 * Uses filenames for comparison to be robust against absolute/relative path differences.
 */
async function runAssetGarbageCollection(): Promise<{ deleted: number, errors: number }> {
  console.log('Starting asset garbage collection...')
  let deleted = 0
  let errors = 0

  try {
    const assetsDir = getAssetsDir()

    // Check if directory exists using async stat
    try {
      await fsPromises.stat(assetsDir)
    } catch {
      console.log('Assets directory does not exist, skipping GC')
      return { deleted: 0, errors: 0 }
    }

    // Get all files currently in the assets directory
    const assetFiles = await fsPromises.readdir(assetsDir)
    console.log(`Found ${assetFiles.length} files in assets directory`)

    // Get all asset paths currently referenced in the metadata cache
    const usedAssetPaths = getUsedAssetPaths()
    console.log(`Found ${usedAssetPaths.size} referenced assets in metadata cache`)

    // Normalize used assets to a Set of filenames for robust comparison
    // This handles both "assets/file.jpg" and "/full/path/to/assets/file.jpg"
    const usedFilenames = new Set<string>()
    for (const assetPath of usedAssetPaths) {
      usedFilenames.add(path.basename(assetPath))
    }

    for (const filename of assetFiles) {
      // Skip if this file is in use (comparing just the filename)
      if (usedFilenames.has(filename)) {
        continue
      }

      // This file is not referenced in the DB, so it's garbage
      const fullPath = path.join(assetsDir, filename)
      try {
        console.log(`Deleting unreferenced asset: ${filename}`)
        await fsPromises.unlink(fullPath)
        deleted++
      } catch (err) {
        console.error(`Failed to delete asset ${filename}:`, err)
        errors++
      }
    }

    console.log(`Garbage collection complete. Deleted: ${deleted}, Errors: ${errors}`)
    return { deleted, errors }
  } catch (err) {
    console.error('Fatal error during asset garbage collection:', err)
    throw err
  }
}


/**
 * Registers IPC handlers for external API operations
 * - AcoustID fingerprint lookup
 * - MusicBrainz metadata lookup
 * - Image download (for cover art)
 */
export function registerApiHandlers() {
  // Handle AcoustID Lookup
  ipcMain.handle('lookup-acoustid', async (_event, fingerprint: string, duration: number) => {
    const ACOUSTID_API_KEY = 'wWcEq1oIC4'
    const ACOUSTID_API_URL = 'https://api.acoustid.org/v2/lookup'

    console.log('Sending AcoustID request from backend')

    const params = new URLSearchParams({
      client: ACOUSTID_API_KEY,
      duration: Math.round(duration).toString(),
      fingerprint: fingerprint,
      meta: 'recordings'
    })

    try {
      const response = await axios.get(`${ACOUSTID_API_URL}?${params.toString()}`)
      const data = response.data

      if (data.results && data.results.length > 0) {
        const bestMatch = data.results[0]
        if (bestMatch.recordings && bestMatch.recordings.length > 0) {
          const recording = bestMatch.recordings[0]
          const result = {
            mbid: recording.id,
            title: recording.title,
            artist: recording.artists?.[0]?.name
          }
          console.log('AcoustID Result:', result)
          return result
        }
      }
      return null
    } catch (error) {
      console.error('Failed to query AcoustID API:', error)
      return null
    }
  })

  // Handle MusicBrainz Lookup
  ipcMain.handle('lookup-musicbrainz', async (_event, mbid: string) => {
    try {
      // Dynamic import to avoid loading it if not needed
      const { MusicBrainzApi } = await import('musicbrainz-api')

      const mbApi = new MusicBrainzApi({
        appName: 'Music Sync App',
        appVersion: '1.0.0',
        appContactInfo: 'abdullahusmanicod@gmail.com'
      })

      console.log(`Fetching MusicBrainz metadata for MBID: ${mbid}`)

      // Lookup recording with artist, release, and release-group info
      // release-groups gives us type info (Album, Single, Compilation, Soundtrack, etc.)
      const data = await mbApi.lookup('recording' as any, mbid, ['artists', 'releases', 'release-groups'] as any)

      console.log('MusicBrainz Data fetched successfully')
      return data
    } catch (error) {
      console.error('Failed to fetch from MusicBrainz:', error)
      return null
    }
  })

  // Handle image download (used for cover art)
  ipcMain.handle('download-image', async (_event, url: string, filePath: string) => {
    try {
      const response = await axios.get(url, { responseType: 'arraybuffer' })
      const buffer = Buffer.from(response.data)

      let targetPath = filePath

      // If saving to assets, resolve relative to userData
      if (filePath.startsWith('assets/')) {
        targetPath = path.join(getAssetsDir(), path.basename(filePath))

        // Ensure directory exists
        const dir = path.dirname(targetPath)
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true })
        }
      }

      fs.writeFileSync(targetPath, buffer)
      console.log('Image saved to:', targetPath)
      // We don't run old cleanup anymore, or maybe we should run GC occasionally?
      // cleanupOldAssets()
      return { success: true }
    } catch (error) {
      console.error('Error downloading image:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  // Handle image download with fallback URLs (tries multiple URLs until one succeeds)
  ipcMain.handle('download-image-with-fallback', async (_event, urls: string[], filePath: string) => {
    let lastError: string | null = null

    for (const url of urls) {
      try {
        console.log(`Trying cover art URL: ${url}`)
        const response = await axios.get(url, {
          responseType: 'arraybuffer',
          timeout: 10000,
          validateStatus: (status) => status === 200 // Only accept 200 OK
        })

        const buffer = Buffer.from(response.data)

        let targetPath = filePath

        // If saving to assets, resolve relative to userData
        if (filePath.startsWith('assets/')) {
          targetPath = path.join(getAssetsDir(), path.basename(filePath))

          // Ensure directory exists
          const dir = path.dirname(targetPath)
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true })
          }
        }

        fs.writeFileSync(targetPath, buffer)
        console.log('Cover art saved from:', url)
        // cleanupOldAssets()
        return { success: true, url } // Return which URL worked
      } catch (error) {
        if (axios.isAxiosError(error)) {
          if (error.response?.status === 404) {
            console.log(`404 Not Found: ${url}, trying next...`)
            lastError = '404 Not Found'
          } else {
            console.log(`Error ${error.response?.status || 'unknown'}: ${url}, trying next...`)
            lastError = error.message
          }
        } else {
          lastError = error instanceof Error ? error.message : 'Unknown error'
        }
        // Continue to next URL
      }
    }

    // All URLs failed
    console.error('All cover art URLs failed. Last error:', lastError)
    return { success: false, error: lastError || 'All URLs returned 404' }
  })

  // Handle manual trigger of Asset Garbage Collection
  ipcMain.handle('run-asset-gc', async () => {
    return await runAssetGarbageCollection()
  })
}
