/**
 * Fingerprint Generator - IPC-based (Main Process)
 * 
 * This module generates audio fingerprints by calling the Main Process,
 * which uses the fpcalc binary (Chromaprint CLI). This avoids the WASM
 * memory exhaustion issues that occur when running fingerprinting in
 * the Renderer process.
 * 
 * The fpcalc binary is automatically downloaded on first use.
 */

// Track consecutive errors for circuit breaker pattern
let consecutiveErrors = 0
const MAX_CONSECUTIVE_ERRORS = 5 // More lenient now that we're using native binary

// Track if fpcalc is ready
let fpcalcReady = false

/**
 * Ensure fpcalc binary is installed and ready
 * This is called automatically on first fingerprint generation
 */
export async function ensureFpcalcReady(): Promise<boolean> {
  if (fpcalcReady) {
    return true
  }

  try {
    console.log('Checking if fpcalc is ready...')
    const result = await window.electronAPI.fingerprintEnsureReady()

    if (result.success) {
      console.log('fpcalc is ready at:', result.path)
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
 * Check if fpcalc is available without downloading
 */
export async function isFpcalcAvailable(): Promise<boolean> {
  try {
    const result = await window.electronAPI.fingerprintCheckReady()
    fpcalcReady = result.ready
    return result.ready
  } catch (error) {
    console.error('Error checking fpcalc availability:', error)
    return false
  }
}

export interface FingerprintResult {
  fingerprint: string
  duration: number
}

/**
 * Generates an AcoustID fingerprint from an audio file
 * Uses fpcalc binary via IPC to the Main Process
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

    // Ensure fpcalc is ready (downloads if necessary)
    if (!fpcalcReady) {
      const ready = await ensureFpcalcReady()
      if (!ready) {
        console.error('fpcalc is not available')
        consecutiveErrors++
        return null
      }
    }

    // Generate fingerprint via IPC (runs fpcalc in Main Process)
    const result = await window.electronAPI.generateFingerprint(filePath)

    if (result.success && result.fingerprint) {
      // Success - reset error counter
      consecutiveErrors = 0
      console.log('Fingerprint generated successfully (duration:', result.duration, 'seconds)')
      return result.fingerprint
    } else {
      console.error('Failed to generate fingerprint:', result.error)
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
 * Generate fingerprint and return both fingerprint and duration
 * Useful when you need the duration for AcoustID lookup
 */
export async function generateFingerprintWithDuration(filePath: string): Promise<FingerprintResult | null> {
  try {
    // Circuit breaker
    if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
      console.warn('Too many consecutive fingerprint errors, skipping.')
      return null
    }

    // Ensure fpcalc is ready
    if (!fpcalcReady) {
      const ready = await ensureFpcalcReady()
      if (!ready) {
        consecutiveErrors++
        return null
      }
    }

    // Generate fingerprint via IPC
    const result = await window.electronAPI.generateFingerprint(filePath)

    if (result.success && result.fingerprint && result.duration) {
      consecutiveErrors = 0
      return {
        fingerprint: result.fingerprint,
        duration: result.duration
      }
    } else {
      consecutiveErrors++
      return null
    }
  } catch (error) {
    consecutiveErrors++
    console.error('Error generating fingerprint with duration:', error)
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

/**
 * Get current error state (for debugging/UI)
 */
export function getFingerprintStatus(): {
  consecutiveErrors: number
  maxErrors: number
  isCircuitBroken: boolean
  fpcalcReady: boolean
} {
  return {
    consecutiveErrors,
    maxErrors: MAX_CONSECUTIVE_ERRORS,
    isCircuitBroken: consecutiveErrors >= MAX_CONSECUTIVE_ERRORS,
    fpcalcReady
  }
}
