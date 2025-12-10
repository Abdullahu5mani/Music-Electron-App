import { ipcMain, dialog, app } from 'electron'
import path from 'path'
import fs from 'fs'
import { Worker } from 'worker_threads'
import { scanMusicFiles, readSingleFileMetadata } from '../../musicScanner'

/**
 * Metadata that can be written to audio files
 */
export interface AudioMetadata {
  title?: string
  artist?: string
  album?: string
  albumArtist?: string
  year?: number
  trackNumber?: number
  trackTotal?: number
  discNumber?: number
  discTotal?: number
  genre?: string
  comment?: string
  coverArtPath?: string  // Path to cover art image file
}

/**
 * Registers IPC handlers for music file operations
 * - Folder scanning and selection
 * - File reading for fingerprinting
 * - Metadata writing (title, artist, album, cover art, etc.)
 */
export function registerMusicHandlers() {
  // Handle music folder scanning
  ipcMain.handle('scan-music-folder', async (_event, folderPath: string) => {
    try {
      return await scanMusicFiles(folderPath)
    } catch (error) {
      console.error('Error scanning folder:', error)
      throw error
    }
  })

  // Handle music folder selection dialog
  ipcMain.handle('select-music-folder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select Music Folder',
    })
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0]
    }
    return null
  })

  // Handle reading metadata for a single file (for in-place updates after tagging)
  ipcMain.handle('read-single-file-metadata', async (_event, filePath: string) => {
    try {
      return await readSingleFileMetadata(filePath)
    } catch (error) {
      console.error('Error reading single file metadata:', error)
      return null
    }
  })

  // Handle read file as buffer (for fingerprint generation) - KEPT FOR BACKWARD COMPATIBILITY
  ipcMain.handle('read-file-buffer', async (_event, filePath: string) => {
    try {
      const buffer = fs.readFileSync(filePath)
      return buffer // Returns Buffer (Uint8Array) efficiently
    } catch (error) {
      console.error('Error reading file:', error)
      throw error
    }
  })

  // Handle generating fingerprint via Worker Thread (fpcalc)
  ipcMain.handle('generate-fingerprint', async (_event, filePath: string) => {
    return new Promise((resolve, reject) => {
      // Resolve path to the worker script
      // In prod: dist-electron/workers/fingerprintWorker.js (because we will add it to entry)
      // In dev: electron/workers/fingerprintWorker.ts (but needs compilation or ts-node)

      let workerPath = ''

      if (app.isPackaged) {
        workerPath = path.join(__dirname, '..', 'workers', 'fingerprintWorker.js')
        // __dirname is dist-electron/ipc/modules (roughly) or dist-electron
        // If main.js is in dist-electron/, then __dirname in this file might depend on how it is bundled.
        // Actually, with vite, everything is bundled into main.js usually, unless code splitting is used.
        // If we configure multiple entries, they will be separate files.
        // Let's assume we configure vite to output workers/fingerprintWorker.js relative to dist-electron.
        workerPath = path.join(app.getAppPath(), 'dist-electron', 'workers', 'fingerprintWorker.js')
      } else {
        // Dev mode
        workerPath = path.join(process.cwd(), 'electron', 'workers', 'fingerprintWorker.ts')
      }

      // In dev, we can't run .ts directly in worker_threads without loader.
      // But vite-plugin-electron usually handles the main process build.
      // If we simply point to the .ts file in dev, it might fail if not compiled.

      // ALTERNATIVE: Use the bundled main.js approach where worker is part of the bundle?
      // Or simply assume that in dev we might need a workaround.
      // However, usually one adds the worker as an entry point in vite config.

      // If we added 'electron/workers/fingerprintWorker.ts' to rollup input,
      // it should be emitted as 'workers/fingerprintWorker.js' in dist-electron.
      // So in both dev and prod, we should look for the .js file in dist-electron if vite is running in watch mode.

      const distWorkerPath = path.join(process.cwd(), 'dist-electron', 'workers', 'fingerprintWorker.js')
      if (fs.existsSync(distWorkerPath)) {
        workerPath = distWorkerPath
      } else {
        // Fallback for dev if not yet built?
        // If the user hasn't run build, dist-electron might not have it.
        // But `npm run dev` should build it if configured.
      }

      console.log('Spawning worker:', workerPath)

      const worker = new Worker(workerPath)

      worker.on('message', (message) => {
        if (message.error) {
          console.error('Worker error:', message.error, message.stderr)
          reject(new Error(message.error))
        } else {
          resolve(message.result.fingerprint)
        }
        worker.terminate()
      })

      worker.on('error', (error) => {
        console.error('Worker thread error:', error)
        reject(error)
        worker.terminate()
      })

      worker.on('exit', (code) => {
        if (code !== 0) {
          reject(new Error(`Worker stopped with exit code ${code}`))
        }
      })

      worker.postMessage({ filePath, id: 1 })
    })
  })

  // Handle writing cover art to file
  ipcMain.handle('write-cover-art', async (_event, filePath: string, imagePath: string) => {
    try {
      const { TagLib } = await import('taglib-wasm')
      const taglib = await TagLib.initialize()

      // Read file into buffer (Sandwich method)
      // This avoids virtual FS issues by operating on memory buffers
      const fileBuffer = fs.readFileSync(filePath)
      const data = new Uint8Array(fileBuffer)
      const file = await taglib.open(data)

      let resolvedImagePath = imagePath
      if (imagePath.startsWith('assets/')) {
        const userDataPath = app.getPath('userData')
        resolvedImagePath = path.join(userDataPath, imagePath)
      }

      console.log('File format detected:', file.getFormat())

      const imageBuffer = fs.readFileSync(resolvedImagePath)
      const imageUint8 = new Uint8Array(imageBuffer)

      // Better MIME detection
      const ext = path.extname(resolvedImagePath).toLowerCase()
      const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg'

      const picture: any = {
        mimeType: mimeType,
        data: imageUint8,
        type: 'Cover (front)',
        description: 'Cover Art'
      }

      console.log('Writing picture with size:', imageBuffer.length, 'MIME:', mimeType)

      // Force tag creation if empty first
      const tag = file.tag()
      if (!tag.title) {
        console.log('Title empty, setting placeholder to force tag creation (using filename)')
        tag.setTitle(path.basename(filePath, path.extname(filePath)))
      }

      // Use setPictures to force replace
      file.setPictures([picture])

      // Save changes to the memory buffer
      if (!file.save()) {
        throw new Error('TagLib failed to save changes to memory buffer')
      }

      // Retrieve the updated buffer and write it back to disk
      const updatedBuffer = file.getFileBuffer()
      fs.writeFileSync(filePath, updatedBuffer)

      file.dispose()

      console.log('Cover art written to disk:', filePath)
      return { success: true }
    } catch (error) {
      console.error('Error writing cover art:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  // Handle writing full metadata to file (title, artist, album, year, cover art, etc.)
  ipcMain.handle('write-metadata', async (_event, filePath: string, metadata: AudioMetadata) => {
    try {
      const { TagLib } = await import('taglib-wasm')
      const taglib = await TagLib.initialize()

      // Read file into buffer (Sandwich method)
      const fileBuffer = fs.readFileSync(filePath)
      const data = new Uint8Array(fileBuffer)
      const file = await taglib.open(data)

      console.log('=== Writing Metadata ===')
      console.log('File:', filePath)
      console.log('Format:', file.getFormat())

      const tag = file.tag()

      // Write basic text fields
      if (metadata.title !== undefined) {
        tag.setTitle(metadata.title)
        console.log('  Title:', metadata.title)
      }

      if (metadata.artist !== undefined) {
        tag.setArtist(metadata.artist)
        console.log('  Artist:', metadata.artist)
      }

      if (metadata.album !== undefined) {
        tag.setAlbum(metadata.album)
        console.log('  Album:', metadata.album)
      }

      // Note: albumArtist is not directly supported by taglib-wasm Tag interface
      // It would require format-specific handling (e.g., ID3v2 frames)

      if (metadata.year !== undefined && metadata.year > 0) {
        tag.setYear(metadata.year)
        console.log('  Year:', metadata.year)
      }

      if (metadata.trackNumber !== undefined && metadata.trackNumber > 0) {
        tag.setTrack(metadata.trackNumber)
        console.log('  Track:', metadata.trackNumber)
      }

      if (metadata.genre !== undefined) {
        tag.setGenre(metadata.genre)
        console.log('  Genre:', metadata.genre)
      }

      if (metadata.comment !== undefined) {
        tag.setComment(metadata.comment)
        console.log('  Comment:', metadata.comment)
      }

      // Handle cover art if provided
      if (metadata.coverArtPath) {
        let resolvedImagePath = metadata.coverArtPath
        if (metadata.coverArtPath.startsWith('assets/')) {
          const userDataPath = app.getPath('userData')
          resolvedImagePath = path.join(userDataPath, metadata.coverArtPath)
        }

        if (fs.existsSync(resolvedImagePath)) {
          const imageBuffer = fs.readFileSync(resolvedImagePath)
          const imageUint8 = new Uint8Array(imageBuffer)

          const ext = path.extname(resolvedImagePath).toLowerCase()
          const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg'

          const picture: any = {
            mimeType: mimeType,
            data: imageUint8,
            type: 'Cover (front)',
            description: 'Cover Art'
          }

          file.setPictures([picture])
          console.log('  Cover Art: embedded (' + imageBuffer.length + ' bytes)')
        } else {
          console.warn('  Cover Art: file not found at', resolvedImagePath)
        }
      }

      // Save changes to the memory buffer
      if (!file.save()) {
        throw new Error('TagLib failed to save changes to memory buffer')
      }

      // Retrieve the updated buffer and write it back to disk
      const updatedBuffer = file.getFileBuffer()
      fs.writeFileSync(filePath, updatedBuffer)

      file.dispose()

      console.log('=== Metadata Written Successfully ===')
      return { success: true }
    } catch (error) {
      console.error('Error writing metadata:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })
}
