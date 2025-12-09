/**
 * Rate Limiter Utility
 * 
 * Provides delays between API calls to respect rate limits:
 * - MusicBrainz: 1 request per second
 * - AcoustID: 3 requests per second  
 * - Cover Art Archive: 1 request per second
 */

/**
 * Simple delay function
 * @param ms - Milliseconds to wait
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * API-specific delays (in milliseconds)
 * Being conservative to stay well within limits
 */
export const API_DELAYS = {
  ACOUSTID: 500,        // AcoustID allows 3/sec, we use 2/sec to be safe
  MUSICBRAINZ: 1100,    // MusicBrainz requires 1/sec, we add buffer
  COVERART: 1100,       // Cover Art Archive follows MusicBrainz rules
  BETWEEN_SONGS: 500,   // Small delay between processing songs in batch
} as const

/**
 * Wait for AcoustID rate limit
 */
export async function waitForAcoustID(): Promise<void> {
  console.log(`Rate limit: waiting ${API_DELAYS.ACOUSTID}ms for AcoustID...`)
  await delay(API_DELAYS.ACOUSTID)
}

/**
 * Wait for MusicBrainz rate limit
 */
export async function waitForMusicBrainz(): Promise<void> {
  console.log(`Rate limit: waiting ${API_DELAYS.MUSICBRAINZ}ms for MusicBrainz...`)
  await delay(API_DELAYS.MUSICBRAINZ)
}

/**
 * Wait for Cover Art Archive rate limit
 */
export async function waitForCoverArt(): Promise<void> {
  console.log(`Rate limit: waiting ${API_DELAYS.COVERART}ms for Cover Art...`)
  await delay(API_DELAYS.COVERART)
}

/**
 * Wait between songs in batch scanning
 */
export async function waitBetweenSongs(): Promise<void> {
  await delay(API_DELAYS.BETWEEN_SONGS)
}

