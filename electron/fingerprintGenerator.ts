import { processAudioFile } from '@unimusic/chromaprint'
import fs from 'fs'
import { parseFile } from 'music-metadata'

/**
 * Generates an AcoustID fingerprint from an audio file
 * Uses @unimusic/chromaprint (WASM-based, no binary needed)
 * 
 * @param audioFilePath - Path to the audio file
 * @returns Fingerprint string or null if generation fails
 */
export async function generateFingerprint(audioFilePath: string): Promise<string | null> {
  try {
    // Check if file exists
    if (!fs.existsSync(audioFilePath)) {
      console.error(`Audio file not found: ${audioFilePath}`)
      return null
    }

    // Read audio file as ArrayBuffer
    const fileBuffer = fs.readFileSync(audioFilePath)
    const arrayBuffer = fileBuffer.buffer.slice(
      fileBuffer.byteOffset,
      fileBuffer.byteOffset + fileBuffer.byteLength
    )
    
    // Generate fingerprint using default config (120 seconds max, default algorithm)
    // processAudioFile returns an async generator, so we get the first (and usually only) fingerprint
    const fingerprintGenerator = processAudioFile(arrayBuffer)
    const result = await fingerprintGenerator.next()
    
    if (result.done || !result.value) {
      console.error(`Failed to generate fingerprint for ${audioFilePath}`)
      return null
    }
    
    return result.value
  } catch (error) {
    console.error(`Failed to generate fingerprint for ${audioFilePath}:`, error)
    return null
  }
}

/**
 * Gets the duration of an audio file (needed for AcoustID lookup)
 */
export async function getAudioDuration(audioFilePath: string): Promise<number | null> {
  try {
    // We can use music-metadata to get duration
    const { parseFile } = await import('music-metadata')
    const metadata = await parseFile(audioFilePath)
    return metadata.format.duration || null
  } catch (error) {
    console.error(`Failed to get audio duration for ${audioFilePath}:`, error)
    return null
  }
}

