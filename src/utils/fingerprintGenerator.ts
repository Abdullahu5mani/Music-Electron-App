/**
 * Generates an AcoustID fingerprint from an audio file
 * Uses @unimusic/chromaprint (WASM-based, browser-only)
 * 
 * @param filePath - Path to the audio file
 * @returns Fingerprint string or null if generation fails
 */
export async function generateFingerprint(filePath: string): Promise<string | null> {
  try {
    console.log('Generating fingerprint for:', filePath)
    
    // Lazy load chromaprint to avoid blocking UI initialization
    const { processAudioFile } = await import('@unimusic/chromaprint')
    
    // Read file buffer via IPC (Electron security)
    const bufferArray = await window.electronAPI.readFileBuffer(filePath)
    const arrayBuffer = new Uint8Array(bufferArray).buffer
    console.log('File loaded, size:', arrayBuffer.byteLength, 'bytes')
    
    // Generate fingerprint using default config (120 seconds max, default algorithm)
    // processAudioFile returns an async generator, so we get the first (and usually only) fingerprint
    const fingerprintGenerator = processAudioFile(arrayBuffer)
    const result = await fingerprintGenerator.next()
    
    if (result.done || !result.value) {
      console.error('Failed to generate fingerprint')
      return null
    }
    
    console.log('Fingerprint generated successfully')
    return result.value
  } catch (error) {
    console.error('Failed to generate fingerprint:', error)
    return null
  }
}

