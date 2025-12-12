/**
 * Parallel Metadata Scanner Worker Pool
 * 
 * Uses parallel processing to scan music file metadata across multiple "workers"
 * Similar to the fingerprint worker pool but for metadata parsing.
 */

import os from 'node:os'
import fs from 'node:fs'
import path from 'node:path'
import { parseFile } from 'music-metadata'
import type { MusicFile } from './musicScanner'

// Common music file extensions
const MUSIC_EXTENSIONS = [
    '.mp3', '.flac', '.wav', '.m4a', '.aac', '.ogg',
    '.opus', '.wma', '.aiff', '.mp4', '.m4p', '.amr',
]

interface ScanJob {
    filePath: string
    fileName: string
    extension: string
    resolve: (result: MusicFile | null) => void
}

interface ScanProgress {
    completed: number
    total: number
    workerId: number
    fileName: string
    percentage: number
}

type ProgressCallback = (progress: ScanProgress) => void

/**
 * Parallel Metadata Scanner
 * Distributes metadata parsing across multiple concurrent "workers"
 */
export class ParallelMetadataScanner {
    private numWorkers: number
    private queue: ScanJob[] = []
    private onProgress?: ProgressCallback
    private completedCount: number = 0
    private totalCount: number = 0
    private isScanning: boolean = false
    private currentScanPromise: Promise<import('./musicScanner').MusicFile[]> | null = null

    constructor(concurrency?: number) {
        const cpuCount = os.cpus().length
        // Use CPU count - 1 to leave resources for UI, min 2, max 16
        this.numWorkers = concurrency ?? Math.max(2, Math.min(cpuCount - 1, 16))
        console.log(`[MetadataScanner] Initialized with ${this.numWorkers} workers (${cpuCount} CPU cores)`)
    }

    /**
     * Set progress callback for real-time updates
     */
    setProgressCallback(callback: ProgressCallback): void {
        this.onProgress = callback
    }

    /**
     * Get worker pool info
     */
    getPoolInfo(): { cpuCount: number; workerCount: number } {
        return {
            cpuCount: os.cpus().length,
            workerCount: this.numWorkers
        }
    }

    /**
     * Discover all music files in a directory (fast filesystem walk)
     * Returns only file paths without parsing metadata
     */
    async discoverFiles(directoryPath: string): Promise<Array<{ filePath: string; fileName: string; extension: string }>> {
        const files: Array<{ filePath: string; fileName: string; extension: string }> = []

        const scanDir = async (dirPath: string): Promise<void> => {
            try {
                const entries = await fs.promises.readdir(dirPath, { withFileTypes: true })

                for (const entry of entries) {
                    const fullPath = path.join(dirPath, entry.name)

                    try {
                        if (entry.isDirectory()) {
                            await scanDir(fullPath)
                        } else if (entry.isFile()) {
                            const ext = path.extname(entry.name).toLowerCase()
                            if (MUSIC_EXTENSIONS.includes(ext)) {
                                files.push({
                                    filePath: fullPath,
                                    fileName: entry.name,
                                    extension: ext
                                })
                            }
                        }
                    } catch {
                        // Skip inaccessible files
                    }
                }
            } catch {
                // Skip inaccessible directories
            }
        }

        await scanDir(directoryPath)
        return files
    }

    /**
     * Parse a single file's metadata
     */
    private async parseFileMetadata(filePath: string, fileName: string, extension: string, _workerId: number): Promise<MusicFile | null> {
        try {
            const stats = await fs.promises.stat(filePath)
            const parsed = await parseFile(filePath)

            // Extract album art and convert to base64
            // Limit size to prevent huge IPC payloads that freeze UI
            const MAX_ALBUM_ART_SIZE = 150 * 1024 // 150KB max for thumbnails
            let albumArt: string | undefined
            if (parsed.common.picture && parsed.common.picture.length > 0) {
                const picture = parsed.common.picture[0]
                // Only include album art if it's reasonably sized
                // Large covers will be loaded on-demand when viewing song details
                if (picture.data.length <= MAX_ALBUM_ART_SIZE) {
                    const buffer = Buffer.from(picture.data)
                    albumArt = `data:${picture.format};base64,${buffer.toString('base64')}`
                } else {
                    // For large images, we'll use a placeholder and load full version on demand
                    // This prevents 50MB+ payloads over IPC which freeze the UI
                    albumArt = undefined // Will show placeholder in UI
                }
            }

            return {
                path: filePath,
                name: fileName,
                extension: extension,
                size: stats.size,
                dateAdded: stats.mtimeMs,
                metadata: {
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
            }
        } catch (error) {
            // If metadata extraction fails, return basic file info
            try {
                const stats = await fs.promises.stat(filePath)
                return {
                    path: filePath,
                    name: fileName,
                    extension: extension,
                    size: stats.size,
                    dateAdded: stats.mtimeMs,
                }
            } catch {
                return null
            }
        }
    }

    /**
     * Process jobs from the queue
     */
    private async processQueue(workerId: number): Promise<void> {
        while (this.queue.length > 0) {
            const job = this.queue.shift()
            if (!job) break

            const result = await this.parseFileMetadata(
                job.filePath,
                job.fileName,
                job.extension,
                workerId
            )

            this.completedCount++

            // Send progress update
            if (this.onProgress) {
                this.onProgress({
                    completed: this.completedCount,
                    total: this.totalCount,
                    workerId,
                    fileName: job.fileName,
                    percentage: Math.round((this.completedCount / this.totalCount) * 100)
                })
            }

            // Log progress periodically (every 10 files)
            if (this.completedCount % 10 === 0 || this.completedCount === this.totalCount) {
                console.log(`[MetadataScanner] Progress: ${this.completedCount}/${this.totalCount} (${Math.round((this.completedCount / this.totalCount) * 100)}%)`)
            }

            job.resolve(result)
        }
    }

    /**
     * Scan all files in parallel and return results in original order
     */
    async scanAll(files: Array<{ filePath: string; fileName: string; extension: string }>): Promise<MusicFile[]> {
        if (files.length === 0) return []

        console.log(`[MetadataScanner] Starting parallel scan of ${files.length} files with ${this.numWorkers} workers`)
        const startTime = Date.now()

        this.completedCount = 0
        this.totalCount = files.length
        this.queue = []

        // Create promises for each file, maintaining order
        const promises: Promise<MusicFile | null>[] = files.map((file) => {
            return new Promise((resolve) => {
                this.queue.push({
                    filePath: file.filePath,
                    fileName: file.fileName,
                    extension: file.extension,
                    resolve
                })
            })
        })

        // Start workers
        const workers: Promise<void>[] = []
        for (let i = 0; i < this.numWorkers; i++) {
            workers.push(this.processQueue(i + 1))
        }

        // Wait for all workers to complete
        await Promise.all(workers)

        // Collect results
        const results = await Promise.all(promises)
        const validResults = results.filter((r): r is MusicFile => r !== null)

        const totalTime = Date.now() - startTime
        const avgTime = files.length > 0 ? totalTime / files.length : 0
        console.log(`[MetadataScanner] Complete: ${validResults.length} files in ${totalTime}ms (avg ${avgTime.toFixed(1)}ms/file)`)

        return validResults
    }

    /**
     * Full scan: discover files + parse metadata in parallel
     * If a scan is already in progress, returns the existing promise
     */
    async scanDirectory(directoryPath: string): Promise<MusicFile[]> {
        // If already scanning, return the existing promise to avoid race conditions
        if (this.isScanning && this.currentScanPromise) {
            console.log('[MetadataScanner] Scan already in progress, waiting for existing scan...')
            return this.currentScanPromise
        }

        this.isScanning = true

        // Create the scan promise
        this.currentScanPromise = this.performScan(directoryPath)

        try {
            const result = await this.currentScanPromise
            return result
        } finally {
            this.isScanning = false
            this.currentScanPromise = null
        }
    }

    /**
     * Internal scan implementation
     */
    private async performScan(directoryPath: string): Promise<MusicFile[]> {
        console.log(`[MetadataScanner] Starting full scan of: ${directoryPath}`)

        // Phase 1: Quick file discovery
        console.log('[MetadataScanner] Phase 1: Discovering files...')
        const discoveryStart = Date.now()
        const files = await this.discoverFiles(directoryPath)
        console.log(`[MetadataScanner] Found ${files.length} music files in ${Date.now() - discoveryStart}ms`)

        if (files.length === 0) {
            return []
        }

        // Phase 2: Parallel metadata parsing
        console.log('[MetadataScanner] Phase 2: Parsing metadata in parallel...')
        return this.scanAll(files)
    }
}

// Singleton instance
let scannerInstance: ParallelMetadataScanner | null = null

export function getParallelScanner(): ParallelMetadataScanner {
    if (!scannerInstance) {
        scannerInstance = new ParallelMetadataScanner()
    }
    return scannerInstance
}
