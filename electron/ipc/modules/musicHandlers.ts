import { ipcMain, dialog, app, BrowserWindow } from 'electron'
import path from 'path'
import fs from 'fs'
import { readSingleFileMetadata } from '../../musicScanner'
import { getParallelScanner } from '../../parallelMetadataScanner'

/**
 * Metadata fields that can be read from or written to audio files.
 */
export interface AudioMetadata {
    /** Track title */
    title?: string
    /** Artist name */
    artist?: string
    /** Album name */
    album?: string
    /** Album artist name */
    albumArtist?: string
    /** Release year */
    year?: number
    /** Track number */
    trackNumber?: number
    /** Total tracks */
    trackTotal?: number
    /** Disc number */
    discNumber?: number
    /** Total discs */
    discTotal?: number
    /** Genre */
    genre?: string
    /** Comment */
    comment?: string
    /** Absolute path to cover art image file */
    coverArtPath?: string
}

/**
 * Registers IPC handlers related to music library operations.
 * 
 * Handlers:
 * - 'scan-music-folder': Scans a directory for music files (PARALLEL).
 * - 'select-music-folder': Opens an OS dialog to pick a folder.
 * - 'read-single-file-metadata': Reads metadata for a specific file.
 * - 'read-file-buffer': Reads file content into a buffer (for fpc).
 * - 'write-cover-art': Embeds an image as cover art.
 * - 'write-metadata': Writes ID3/Vorbis tags to a file.
 */
export function registerMusicHandlers() {
    // Handle music folder scanning - uses PARALLEL metadata parsing
    ipcMain.handle('scan-music-folder', async (event, folderPath: string, options?: { scanSubfolders?: boolean }) => {
        try {
            const scanner = getParallelScanner()

            // Set up progress callback to send to renderer
            const window = BrowserWindow.fromWebContents(event.sender)
            if (window) {
                scanner.setProgressCallback((progress) => {
                    window.webContents.send('scan-progress', progress)
                })
            }

            // Use parallel scanner with scanSubfolders option (default: true)
            const scanSubfolders = options?.scanSubfolders !== false
            return await scanner.scanDirectory(folderPath, scanSubfolders)
        } catch (error) {
            console.error('Error scanning folder:', error)
            throw error
        }
    })

    // Flag to track if a folder selection dialog is already open
    let isFolderDialogOpen = false

    // Handle music folder selection dialog
    ipcMain.handle('select-music-folder', async () => {
        // Prevent opening multiple dialogs
        if (isFolderDialogOpen) {
            console.log('[MusicHandlers] Folder dialog already open, ignoring request')
            return null
        }

        try {
            isFolderDialogOpen = true
            const result = await dialog.showOpenDialog({
                properties: ['openDirectory'],
                title: 'Select Music Folder',
            })

            if (!result.canceled && result.filePaths.length > 0) {
                return result.filePaths[0]
            }
            return null
        } finally {
            isFolderDialogOpen = false
        }
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

    // Handle read file as buffer (for fingerprint generation)
    ipcMain.handle('read-file-buffer', async (_event, filePath: string) => {
        try {
            const buffer = fs.readFileSync(filePath)
            return buffer // Returns Buffer (Uint8Array) efficiently
        } catch (error) {
            console.error('Error reading file:', error)
            throw error
        }
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
            let shouldDeleteTempFile = false

            if (imagePath.startsWith('assets/')) {
                const userDataPath = app.getPath('userData')
                resolvedImagePath = path.join(userDataPath, imagePath)
                shouldDeleteTempFile = true // Mark for cleanup after embedding
            }

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

            // Force tag creation if empty first
            const tag = file.tag()
            if (!tag.title) {
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

            // Delete temp cover art file after successful embedding
            // The image is now embedded in the audio file, so we don't need the temp file
            if (shouldDeleteTempFile && fs.existsSync(resolvedImagePath)) {
                try {
                    fs.unlinkSync(resolvedImagePath)
                    console.log('[CoverArt] Cleaned up temp file:', path.basename(resolvedImagePath))
                } catch (cleanupError) {
                    // Non-fatal - just log and continue
                    console.warn('[CoverArt] Failed to cleanup temp file:', cleanupError)
                }
            }

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
            const tag = file.tag()

            // Write basic text fields
            if (metadata.title !== undefined) {
                tag.setTitle(metadata.title)
            }

            if (metadata.artist !== undefined) {
                tag.setArtist(metadata.artist)
            }

            if (metadata.album !== undefined) {
                tag.setAlbum(metadata.album)
            }

            // Note: albumArtist is not directly supported by taglib-wasm Tag interface
            // It would require format-specific handling (e.g., ID3v2 frames)

            if (metadata.year !== undefined && metadata.year > 0) {
                tag.setYear(metadata.year)
            }

            if (metadata.trackNumber !== undefined && metadata.trackNumber > 0) {
                tag.setTrack(metadata.trackNumber)
            }

            if (metadata.genre !== undefined) {
                tag.setGenre(metadata.genre)
            }

            if (metadata.comment !== undefined) {
                tag.setComment(metadata.comment)
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

            return { success: true }
        } catch (error) {
            console.error('Error writing metadata:', error)
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
        }
    })
}
