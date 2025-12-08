/**
 * AcoustID API Client
 * Queries AcoustID API with fingerprint to get MusicBrainz IDs
 */

// Constants moved to backend (electron/ipc/handlers.ts)

export interface AcoustIDResultData {
  mbid: string
  title?: string
  artist?: string
}

export async function lookupFingerprint(
  fingerprint: string,
  duration: number
): Promise<AcoustIDResultData | null> {
  console.log('acoustic id sent (via IPC)')

  try {
    return await window.electronAPI.lookupAcoustid(fingerprint, duration)
  } catch (error) {
    console.error('Failed to query AcoustID API via IPC:', error)
    return null
  }
}

