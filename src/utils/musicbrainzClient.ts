/**
 * MusicBrainz API Client
 * Fetches metadata for a given MusicBrainz Recording ID (MBID)
 */
import { MusicBrainzApi } from 'musicbrainz-api'

const mbApi = new MusicBrainzApi({
    appName: 'Music Sync App',
    appVersion: '1.0.0',
    appContactInfo: 'abdullahusmanicod@gmail.com'
})

export interface MusicBrainzArtist {
    id: string
    name: string
    'sort-name'?: string
}

export interface MusicBrainzRelease {
    id: string
    title: string
    date?: string
    country?: string
}

export interface MusicBrainzRecording {
    id: string
    title: string
    length?: number
    'artist-credit'?: Array<{
        artist: MusicBrainzArtist
        name?: string // Credit name (e.g. "feat. X")
        joinphrase?: string
    }>
    releases?: MusicBrainzRelease[]
}

/**
 * Fetches metadata for a recording from MusicBrainz
 * @param mbid - The MusicBrainz Recording ID
 * @returns The recording metadata or null if failed
 */
export async function lookupRecording(mbid: string): Promise<MusicBrainzRecording | null> {
    try {
        console.log(`Fetching MusicBrainz metadata for MBID: ${mbid}`)

        // Lookup recording with artist and release info
        const data = await mbApi.lookup('recording', mbid, ['artists', 'releases'])

        console.log('MusicBrainz Data:', data)
        return data as unknown as MusicBrainzRecording

    } catch (error) {
        console.error('Failed to fetch from MusicBrainz:', error)
        return null
    }
}

/**
 * Generates the URL for the smallest available front cover art (250px)
 * per the Cover Art Archive API.
 * 
 * @param releaseMbid - The MusicBrainz Release ID
 * @returns The URL to the cover art
 */
export function getCoverArtUrl(releaseMbid: string): string {
    return `https://coverartarchive.org/release/${releaseMbid}/front-250`
}
