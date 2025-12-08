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
        console.log(`Fetching MusicBrainz metadata for MBID: ${mbid} (via IPC)`)

        // Call backend handler
        const data = await window.electronAPI.lookupMusicBrainz(mbid)

        console.log('MusicBrainz Data:', data)
        return data as unknown as MusicBrainzRecording

    } catch (error) {
        console.error('Failed to fetch from MusicBrainz via IPC:', error)
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
