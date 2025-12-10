/**
 * Fingerprint Generator
 * 
 * Previously used @unimusic/chromaprint (WASM-based) in renderer, which caused memory issues.
 * Now offloaded to Main Process using a Worker Thread and fpcalc binary.
 */

// Track consecutive errors for circuit breaker pattern
let consecutiveErrors = 0
const MAX_CONSECUTIVE_ERRORS = 5

/**
 * Generates an AcoustID fingerprint from an audio file
 * Offloads to Main Process -> Worker Thread -> fpcalc
 * 
 * @param filePath - Path to the audio file
 * @returns Fingerprint string or null if generation fails
 */
export async function generateFingerprint(filePath: string): Promise<string | null> {
  try {
    // Circuit breaker: if we've had too many consecutive errors, skip
    if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
      console.warn('Too many consecutive fingerprint errors, skipping.')
      return null
    }

    console.log('Requesting fingerprint for:', filePath)
    
    // Call new IPC method
    const fingerprint = await window.electronAPI.generateFingerprint(filePath)
    
    if (!fingerprint) {
      console.error('Failed to generate fingerprint (empty result)')
      consecutiveErrors++
      return null
    }
    
    // Success - reset error counter
    consecutiveErrors = 0
    
    console.log('Fingerprint generated successfully')
    return fingerprint
  } catch (error: any) {
    consecutiveErrors++
    console.error('Failed to generate fingerprint:', error)
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
