/**
 * Fingerprint Worker Pool
 * 
 * Manages parallel fpcalc processes using a slot-based worker pool.
 * Each slot represents one concurrent fpcalc process.
 * 
 * Features:
 * - Automatic detection of CPU cores
 * - Parallel fingerprint generation (one per core)
 * - Ordered results queue
 * - Slot-based logging (e.g., "Worker 1", "Worker 2")
 */

import os from 'os'
import { generateFingerprintWithFpcalc, ensureFpcalc } from './fpcalcManager'

// Get optimal worker count (leave 1 core for UI/system)
const NUM_CPUS = os.cpus().length
const DEFAULT_WORKER_COUNT = Math.max(1, NUM_CPUS - 1)

/**
 * Result from a single fingerprint operation
 */
export interface PoolFingerprintResult {
    success: boolean
    fingerprint: string | null
    duration: number | null
}

/**
 * Result of a fingerprinting job with metadata
 */
export interface FingerprintJobResult {
    filePath: string
    index: number  // Original index for ordering
    result: PoolFingerprintResult
    workerId: number  // Which worker processed this
    processingTimeMs: number
}

/**
 * Job waiting in the queue
 */
interface QueuedJob {
    filePath: string
    index: number
    resolve: (result: FingerprintJobResult) => void
    reject: (error: Error) => void
}

/**
 * Worker slot state
 */
interface WorkerSlot {
    id: number
    busy: boolean
    currentFile: string | null
    processedCount: number
}

/**
 * Fingerprint Worker Pool
 * Manages concurrent fpcalc processes with slot-based tracking
 */
class FingerprintWorkerPool {
    private workerCount: number
    private slots: WorkerSlot[]
    private queue: QueuedJob[] = []
    private isProcessing: boolean = false
    private totalProcessed: number = 0
    private onProgress?: (completed: number, total: number, workerId: number, filePath: string) => void

    constructor(workerCount: number = DEFAULT_WORKER_COUNT) {
        this.workerCount = workerCount
        this.slots = Array.from({ length: workerCount }, (_, i) => ({
            id: i + 1,  // 1-indexed for human-readable logs
            busy: false,
            currentFile: null,
            processedCount: 0
        }))
        console.log(`[FingerprintPool] Initialized with ${workerCount} workers (${NUM_CPUS} CPU cores detected)`)
    }

    /**
     * Set progress callback
     */
    setProgressCallback(callback: (completed: number, total: number, workerId: number, filePath: string) => void) {
        this.onProgress = callback
    }

    /**
     * Get an available worker slot
     */
    private getAvailableSlot(): WorkerSlot | null {
        return this.slots.find(slot => !slot.busy) || null
    }

    /**
     * Process a single job on a specific slot
     */
    private async processJob(slot: WorkerSlot, job: QueuedJob): Promise<void> {
        const startTime = Date.now()
        const fileName = job.filePath.split(/[\\/]/).pop() || job.filePath

        slot.busy = true
        slot.currentFile = fileName

        console.log(`[Worker ${slot.id}] Starting: "${fileName}"`)

        try {
            const fpcalcResult = await generateFingerprintWithFpcalc(job.filePath)
            const processingTimeMs = Date.now() - startTime

            slot.processedCount++
            this.totalProcessed++

            // Convert FingerprintResult | null to PoolFingerprintResult
            const poolResult: PoolFingerprintResult = fpcalcResult
                ? { success: true, fingerprint: fpcalcResult.fingerprint, duration: fpcalcResult.duration }
                : { success: false, fingerprint: null, duration: null }

            console.log(`[Worker ${slot.id}] Complete: "${fileName}" (${processingTimeMs}ms) - ${poolResult.success ? 'Success' : 'Failed'}`)

            job.resolve({
                filePath: job.filePath,
                index: job.index,
                result: poolResult,
                workerId: slot.id,
                processingTimeMs
            })

            // Call progress callback if set
            if (this.onProgress) {
                this.onProgress(this.totalProcessed, this.queue.length + this.totalProcessed, slot.id, fileName)
            }
        } catch (error) {
            const processingTimeMs = Date.now() - startTime
            console.error(`[Worker ${slot.id}] Error: "${fileName}" (${processingTimeMs}ms)`, error)

            job.resolve({
                filePath: job.filePath,
                index: job.index,
                result: { success: false, fingerprint: null, duration: null },
                workerId: slot.id,
                processingTimeMs
            })
        } finally {
            slot.busy = false
            slot.currentFile = null
            this.processNextInQueue()
        }
    }

    /**
     * Process next job from queue if a slot is available
     */
    private processNextInQueue(): void {
        if (this.queue.length === 0) {
            // Check if all workers are idle
            const allIdle = this.slots.every(slot => !slot.busy)
            if (allIdle && this.isProcessing) {
                this.isProcessing = false
                console.log(`[FingerprintPool] All jobs complete. Total processed: ${this.totalProcessed}`)
            }
            return
        }

        const slot = this.getAvailableSlot()
        if (!slot) return

        const job = this.queue.shift()!
        this.processJob(slot, job)
    }

    /**
     * Add a file to the processing queue
     * Returns a promise that resolves when this specific file is done
     */
    enqueue(filePath: string, index: number): Promise<FingerprintJobResult> {
        return new Promise((resolve, reject) => {
            this.queue.push({ filePath, index, resolve, reject })

            if (!this.isProcessing) {
                this.isProcessing = true
                // Start processing on all available slots
                for (let i = 0; i < this.workerCount; i++) {
                    this.processNextInQueue()
                }
            } else {
                // Try to start if there's an available slot
                this.processNextInQueue()
            }
        })
    }

    /**
     * Process multiple files in parallel, returns results IN ORDER
     */
    async processAll(filePaths: string[]): Promise<FingerprintJobResult[]> {
        if (filePaths.length === 0) return []

        // Ensure fpcalc is installed before starting
        console.log(`[FingerprintPool] Ensuring fpcalc is installed...`)
        const ready = await ensureFpcalc()
        if (!ready) {
            console.error('[FingerprintPool] fpcalc not available')
            return filePaths.map((fp, i) => ({
                filePath: fp,
                index: i,
                result: { success: false, fingerprint: null, duration: null },
                workerId: 0,
                processingTimeMs: 0
            }))
        }

        this.totalProcessed = 0
        console.log(`[FingerprintPool] Starting batch of ${filePaths.length} files with ${this.workerCount} workers`)
        const startTime = Date.now()

        // Enqueue all files and collect promises
        const promises = filePaths.map((filePath, index) => this.enqueue(filePath, index))

        // Wait for all to complete
        const results = await Promise.all(promises)

        const totalTime = Date.now() - startTime
        const avgTime = Math.round(totalTime / filePaths.length)
        console.log(`[FingerprintPool] Batch complete: ${filePaths.length} files in ${totalTime}ms (avg ${avgTime}ms/file)`)

        // Sort by original index to maintain order
        return results.sort((a, b) => a.index - b.index)
    }

    /**
     * Get current pool status
     */
    getStatus(): { workerCount: number; queueLength: number; activeWorkers: number; slots: WorkerSlot[] } {
        return {
            workerCount: this.workerCount,
            queueLength: this.queue.length,
            activeWorkers: this.slots.filter(s => s.busy).length,
            slots: [...this.slots]
        }
    }

    /**
     * Clear the queue (doesn't cancel in-progress work)
     */
    clearQueue(): void {
        this.queue = []
        console.log('[FingerprintPool] Queue cleared')
    }
}

// Singleton instance
let poolInstance: FingerprintWorkerPool | null = null

/**
 * Get the singleton worker pool instance
 */
export function getFingerprintPool(workerCount?: number): FingerprintWorkerPool {
    if (!poolInstance) {
        poolInstance = new FingerprintWorkerPool(workerCount)
    }
    return poolInstance
}

/**
 * Generate fingerprints for multiple files in parallel
 * This is the main entry point for batch fingerprinting
 */
export async function generateFingerprintsParallel(
    filePaths: string[],
    onProgress?: (completed: number, total: number, workerId: number, filePath: string) => void
): Promise<FingerprintJobResult[]> {
    const pool = getFingerprintPool()
    if (onProgress) {
        pool.setProgressCallback(onProgress)
    }
    return pool.processAll(filePaths)
}

/**
 * Get the number of available CPU cores
 */
export function getCPUCount(): number {
    return NUM_CPUS
}

/**
 * Get the default worker count
 */
export function getDefaultWorkerCount(): number {
    return DEFAULT_WORKER_COUNT
}
