/**
 * Fingerprint Generator using @unimusic/chromaprint (WASM-based)
 * 
 * KNOWN ISSUE: The WASM module has memory management issues - it doesn't properly
 * clean up between operations. After processing many files, the WASM memory can
 * become exhausted, causing "memory access out of bounds" errors.
 * 
 * WORKAROUND: We limit file sizes processed and add delays to give GC time to run.
 * For production use, consider using fpcalc binary in main process instead.
 */

// Maximum file size to process (larger files use more WASM memory)
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB limit for WASM processing

// Track consecutive errors for circuit breaker pattern
let consecutiveErrors = 0
const MAX_CONSECUTIVE_ERRORS = 3

/**
 * Small delay to allow garbage collection between fingerprint operations
 */
function smallDelay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Generates an AcoustID fingerprint from an audio file
 * Uses @unimusic/chromaprint (WASM-based, browser-only)
 * 
 * @param filePath - Path to the audio file
 * @returns Fingerprint string or null if generation fails
 */
export async function generateFingerprint(filePath: string): Promise<string | null> {
  try {
    // Circuit breaker: if we've had too many consecutive errors, skip
    if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
      console.warn('Too many consecutive fingerprint errors, skipping. Try restarting the app.')
      return null
    }

    console.log('Generating fingerprint for:', filePath)
    
    // Read file buffer via IPC (Electron security)
    const bufferArray = await window.electronAPI.readFileBuffer(filePath)
    
    // Check file size before processing
    if (bufferArray.length > MAX_FILE_SIZE) {
      console.warn(`File too large for WASM processing (${Math.round(bufferArray.length / 1024 / 1024)}MB > ${MAX_FILE_SIZE / 1024 / 1024}MB limit)`)
      return null
    }
    
    const arrayBuffer = new Uint8Array(bufferArray).buffer
    console.log('File loaded, size:', arrayBuffer.byteLength, 'bytes')
    
    // Small delay before processing to allow memory cleanup
    await smallDelay(100)
    
    // Import chromaprint module fresh each time to try to get clean WASM state
    const { processAudioFile } = await import('@unimusic/chromaprint')
    
    // Generate fingerprint using default config (120 seconds max, default algorithm)
    const fingerprintGenerator = processAudioFile(arrayBuffer)
    const result = await fingerprintGenerator.next()
    
    if (result.done || !result.value) {
      console.error('Failed to generate fingerprint')
      consecutiveErrors++
      return null
    }
    
    // Success - reset error counter
    consecutiveErrors = 0
    
    console.log('Fingerprint generated successfully')
    return result.value
  } catch (error: any) {
    consecutiveErrors++
    
    // Check for WASM memory errors
    if (error?.message?.includes('memory access out of bounds')) {
      console.error(`WASM memory exhausted (error ${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}). Large batch scans may need app restart.`)
    } else {
      console.error('Failed to generate fingerprint:', error)
    }
    
    return null
  }
}

/**
 * Reset the error counter
 * Call this when starting a new scan session
 */
export function resetFingerprintErrors(): void {
  consecutiveErrors = 0
}

