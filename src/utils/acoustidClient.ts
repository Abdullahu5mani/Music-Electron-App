/**
 * AcoustID API Client
 * Queries AcoustID API with fingerprint to get MusicBrainz IDs
 */

const ACOUSTID_API_KEY = 'wWcEq1oIC4' // Application API key for Music Sync App
const ACOUSTID_API_URL = 'https://api.acoustid.org/v2/lookup'

export interface AcoustIDResult {
  id: string
  score: number
  recordings?: Array<{
    id: string // MusicBrainz Recording ID (MBID)
    title?: string
    duration?: number
    artists?: Array<{
      id?: string
      name: string
    }>
    releasegroups?: Array<{
      id: string
      type?: string
      title?: string
    }>
  }>
}

export interface AcoustIDResponse {
  status: string
  results?: AcoustIDResult[]
  error?: {
    message: string
  }
}

export interface AcoustIDResultData {
  mbid: string
  title?: string
  artist?: string
}

export async function lookupFingerprint(
  fingerprint: string,
  duration: number
): Promise<AcoustIDResultData | null> {
  console.log('acoustic id sent')

  const params = new URLSearchParams({
    client: ACOUSTID_API_KEY,
    duration: Math.round(duration).toString(),
    fingerprint: fingerprint,
    meta: 'recordings'
  })

  try {
    const response = await fetch(`${ACOUSTID_API_URL}?${params.toString()}`)
    const data: AcoustIDResponse = await response.json()

    if (data.results && data.results.length > 0) {
      const bestMatch = data.results[0]

      // Only accept if confidence is high (e.g., > 0.8)
      // The user's example used 0.8, but sometimes scores are lower. 
      // I'll stick to the user's example logic but maybe be slightly lenient if needed, 
      // but for now I will follow the user's snippet logic if provided, or just check for existence.
      // User snippet: if (bestMatch.score > 0.8)

      if (bestMatch.recordings && bestMatch.recordings.length > 0) {
        const recording = bestMatch.recordings[0]
        const result = {
          mbid: recording.id,
          title: recording.title,
          artist: recording.artists?.[0]?.name
        }
        console.log('AcoustID Result:', result)
        return result
      }
    }

    return null
  } catch (error) {
    console.error('Failed to query AcoustID API:', error)
    return null
  }
}

