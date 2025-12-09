/**
 * Fingerprint Generator using @unimusic/chromaprint (WASM-based)
 * 
 * KNOWN ISSUE: The WASM module has memory management issues - it doesn't properly
 * clean up between operations. After processing many files, the WASM memory can
 * become exhausted, causing "memory access out of bounds" errors.
 * 
 * WORKAROUND: We limit file sizes processed and add delays to give GC time to run.
 * For production use, consider using fpcalc binary in main process instead.
 * 
 * ADDITIONAL WORKAROUND: Track how many files have been processed with the current
 * WASM instance and re-init it every N files to release memory (default: 5).
 */

// Maximum file size to process (larger files use more WASM memory)
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB limit for WASM processing

// Track consecutive errors for circuit breaker pattern
let consecutiveErrors = 0
const MAX_CONSECUTIVE_ERRORS = 3

// Track WASM instance lifecycle
let chromaprintModule: any | null = null
let filesSinceInit = 0
const MAX_FILES_BEFORE_RESET = 1 // Reset the WASM module after each file

/**
 * Small delay to allow garbage collection between fingerprint operations
 */
function smallDelay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Get or initialize the chromaprint module.
 * We cache the module to avoid repeated loads, but reset it after a small batch
 * to mitigate WASM memory exhaustion.
 */
async function getChromaprintModule() {
  if (!chromaprintModule) {
    chromaprintModule = await import('@unimusic/chromaprint')
    filesSinceInit = 0
  }
  return chromaprintModule
}

/**
 * Reset the chromaprint module so the next call re-imports a fresh WASM instance.
 * There is no explicit destroy API; dropping the reference and a short delay
 * allows GC to reclaim the memory.
 */
async function resetChromaprintModule() {
  console.log('Clearing chromaprint WASM cache and reloading...')
  chromaprintModule = null
  filesSinceInit = 0
  await smallDelay(50)
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
    
    // Get or init chromaprint module (cached, but reset after N files)
    const { processAudioFile } = await getChromaprintModule()
    
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
    filesSinceInit += 1
    
    // Reset WASM module after a small batch to free memory
    if (filesSinceInit >= MAX_FILES_BEFORE_RESET) {
      console.log(`Resetting chromaprint WASM after ${filesSinceInit} files...`)
      await resetChromaprintModule()
    }
    
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

