import { ipcMain, app } from 'electron'
import path from 'path'
import fs from 'fs'
import axios from 'axios'

// Rate limiting delay for Cover Art Archive (1 req/sec)
const COVER_ART_DELAY_MS = 1100

/**
 * Helper to add delay between API calls
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

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


      // Lookup recording with artist, release, and release-group info
      // release-groups gives us type info (Album, Single, Compilation, Soundtrack, etc.)
      const data = await mbApi.lookup('recording' as any, mbid, ['artists', 'releases', 'release-groups'] as any)

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
      cleanupOldAssets()
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
        const response = await axios.get(url, {
          responseType: 'arraybuffer',
          timeout: 10000,
          validateStatus: (status) => status === 200, // Only accept 200 OK
          headers: {
            'User-Agent': 'MusicSyncApp/1.0.0 (abdullahusmanicod@gmail.com)'
          }
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
        cleanupOldAssets()
        return { success: true, url } // Return which URL worked
      } catch (error) {
        if (axios.isAxiosError(error)) {
          if (error.response?.status === 404) {
            lastError = '404 Not Found'
          } else {
            lastError = error.message
          }
        } else {
          lastError = error instanceof Error ? error.message : 'Unknown error'
        }
        // Rate limit: wait before trying next URL
        await delay(COVER_ART_DELAY_MS)
      }
    }

    // All URLs failed
    console.error('All cover art URLs failed. Last error:', lastError)
    return { success: false, error: lastError || 'All URLs returned 404' }
  })
}

