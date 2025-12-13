/**
 * Fingerprint Generator - IPC-based (Main Process)
 * 
 * This module generates audio fingerprints by calling the Main Process,
 * which uses the fpcalc binary (Chromaprint CLI). This avoids the WASM
 * memory exhaustion issues that occur when running fingerprinting in
 * the Renderer process.
 * 
 * Supports both single-file and parallel batch fingerprinting.
 */

// Track consecutive errors for circuit breaker pattern
let consecutiveErrors = 0
const MAX_CONSECUTIVE_ERRORS = 5

// Track if fpcalc is ready
let fpcalcReady = false

/**
 * Ensure fpcalc binary is installed and ready
 */
export async function ensureFpcalcReady(): Promise<boolean> {
  if (fpcalcReady) {
    return true
  }

  try {
    const result = await window.electronAPI.fingerprintEnsureReady()

    if (result.success) {
      fpcalcReady = true
      return true
    } else {
      console.error('Failed to ensure fpcalc is ready:', result.error)
      return false
    }
  } catch (error) {
    console.error('Error ensuring fpcalc is ready:', error)
    return false
  }
}

/**
 * Result of a single fingerprint operation in a batch
 */
export interface BatchFingerprintResult {
  filePath: string
  success: boolean
  fingerprint: string | null
  duration: number | null
  workerId: number
  processingTimeMs: number
}

/**
 * Generates an AcoustID fingerprint from an audio file
 * Uses fpcalc binary via IPC to the Main Process
 */
export async function generateFingerprint(filePath: string): Promise<string | null> {
  try {
    if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
      console.warn('Too many consecutive fingerprint errors, skipping.')
      return null
    }

    if (!fpcalcReady) {
      const ready = await ensureFpcalcReady()
      if (!ready) {
        consecutiveErrors++
        return null
      }
    }

    const result = await window.electronAPI.generateFingerprint(filePath)

    if (result.success && result.fingerprint) {
      consecutiveErrors = 0
      return result.fingerprint
    } else {
      consecutiveErrors++
      return null
    }
  } catch (error: any) {
    consecutiveErrors++
    console.error('Error generating fingerprint:', error.message || error)
    return null
  }
}

/**
 * Generate fingerprints for multiple files in PARALLEL
 * Uses the worker pool in the Main Process for maximum performance
 * 
 * @param filePaths - Array of file paths to fingerprint
 * @param onProgress - Optional callback for progress updates
 * @returns Array of results in the same order as input files
 */
export async function generateFingerprintsBatch(
  filePaths: string[],
  onProgress?: (progress: {
    completed: number
    total: number
    workerId: number
    fileName: string
    percentage: number
  }) => void
): Promise<BatchFingerprintResult[]> {
  if (filePaths.length === 0) {
    return []
  }

  // Set up progress listener if callback provided
  let cleanup: (() => void) | undefined
  if (onProgress) {
    cleanup = window.electronAPI.onFingerprintBatchProgress(onProgress)
  }

  try {
    const result = await window.electronAPI.generateFingerprintsBatch(filePaths)

    if (result.success && result.results) {
      return result.results
    } else {
      console.error('Batch fingerprinting failed:', result.error)
      return filePaths.map(fp => ({
        filePath: fp,
        success: false,
        fingerprint: null,
        duration: null,
        workerId: 0,
        processingTimeMs: 0
      }))
    }
  } finally {
    // Clean up progress listener
    cleanup?.()
  }
}

/**
 * Reset the error counter - call when starting a new scan session
 */
export function resetFingerprintErrors(): void {
  consecutiveErrors = 0
}
