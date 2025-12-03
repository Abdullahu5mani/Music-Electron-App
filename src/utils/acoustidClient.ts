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

/**
 * Looks up a fingerprint in AcoustID API
 * 
 * @param fingerprint - The fingerprint string from chromaprint
 * @param duration - Duration of the audio in seconds
 * @returns AcoustID response with MusicBrainz IDs
 */
export async function lookupFingerprint(
  fingerprint: string,
  duration: number
): Promise<AcoustIDResponse | null> {
  try {
    console.log('=== Querying AcoustID API ===')
    console.log('Fingerprint:', fingerprint.substring(0, 50) + '...')
    console.log('Duration:', duration, 'seconds')
    
    const params = new URLSearchParams({
      client: ACOUSTID_API_KEY,
      fingerprint: fingerprint,
      duration: Math.round(duration).toString(),
      meta: 'recordings+releasegroups+compress', // Get full metadata including title, artist, album, release groups
    })
    
    const url = `${ACOUSTID_API_URL}?${params.toString()}`
    console.log('API URL:', url.replace(ACOUSTID_API_KEY, '***'))
    
    const response = await fetch(url)
    
    if (!response.ok) {
      console.error('AcoustID API error:', response.status, response.statusText)
      const errorText = await response.text()
      console.error('Error response:', errorText)
      return null
    }
    
    const responseText = await response.text()
    console.log('=== RAW API RESPONSE (NOT PARSED) ===')
    console.log('Full response:', responseText)
    console.log('Response length:', responseText.length, 'characters')
    console.log('=====================================')
    
    const data: AcoustIDResponse = JSON.parse(responseText)
    console.log('\n=== AcoustID API Response (Parsed) ===')
    console.log('Status:', data.status)
    console.log('Results count:', data.results?.length || 0)
    
    if (data.results && data.results.length > 0) {
      console.log('\n=== Top Result ===')
      const topResult = data.results[0]
      console.log('Score:', topResult.score)
      console.log('AcoustID Track ID:', topResult.id)
      console.log('Recordings array:', topResult.recordings)
      console.log('Recordings count:', topResult.recordings?.length || 0)
      
      // Log the full result structure
      console.log('\n=== Full Result Object ===')
      console.log(JSON.stringify(topResult, null, 2))
      
      if (topResult.recordings && topResult.recordings.length > 0) {
        topResult.recordings.forEach((recording, index) => {
          console.log(`\nRecording ${index + 1}:`)
          console.log('  MBID:', recording.id)
          console.log('  Title:', recording.title || 'N/A')
          console.log('  Duration:', recording.duration ? `${Math.round(recording.duration)}s` : 'N/A')
          console.log('  Artists:', recording.artists?.map(a => a.name).join(', ') || 'N/A')
          if (recording.releasegroups && recording.releasegroups.length > 0) {
            console.log('  Albums:')
            recording.releasegroups.forEach((rg) => {
              console.log(`    - ${rg.title || 'N/A'} (${rg.type || 'Unknown'})`)
            })
          }
        })
      }
    } else {
      console.log('No results found')
    }
    
    console.log('============================')
    
    return data
  } catch (error) {
    console.error('Failed to query AcoustID API:', error)
    return null
  }
}

