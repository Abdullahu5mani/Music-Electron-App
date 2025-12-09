export interface MusicBrainzArtist {
    id: string
    name: string
    'sort-name'?: string
}

export interface MusicBrainzReleaseGroup {
    id: string
    title: string
    'primary-type'?: string // "Album", "Single", "EP", etc.
    'secondary-types'?: string[] // ["Compilation"], ["Soundtrack"], etc.
}

export interface MusicBrainzRelease {
    id: string
    title: string
    date?: string
    country?: string
    status?: string // "Official", "Bootleg", "Promotion"
    'release-group'?: MusicBrainzReleaseGroup
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

/**
 * Generates an array of cover art URLs to try in order.
 * Falls back through releases, then sizes, then release groups.
 * This handles cases where some releases don't have cover art (404 errors).
 * 
 * @param releases - Array of MusicBrainz releases
 * @param releaseGroupId - Optional release group ID for final fallback
 * @returns Array of URLs to try in priority order
 */
export function getCoverArtUrls(releases: MusicBrainzRelease[], releaseGroupId?: string): string[] {
    const urls: string[] = []
    
    if (releases.length === 0) {
        // If no releases, try release group only
        if (releaseGroupId) {
            urls.push(`https://coverartarchive.org/release-group/${releaseGroupId}/front-250`)
            urls.push(`https://coverartarchive.org/release-group/${releaseGroupId}/front-500`)
            urls.push(`https://coverartarchive.org/release-group/${releaseGroupId}/front`)
        }
        return urls
    }
    
    // Priority 1: Try 250px front cover for each release (best quality/size ratio)
    // Try all releases, not just the first one
    for (const release of releases) {
        urls.push(`https://coverartarchive.org/release/${release.id}/front-250`)
    }
    
    // Priority 2: Try 500px front cover for each release (higher quality)
    for (const release of releases) {
        urls.push(`https://coverartarchive.org/release/${release.id}/front-500`)
    }
    
    // Priority 3: Try original size for each release (largest)
    for (const release of releases) {
        urls.push(`https://coverartarchive.org/release/${release.id}/front`)
    }
    
    // Priority 4: Try release group if available (some albums only have art at group level)
    // Also try to extract from releases if not provided
    let rgId = releaseGroupId
    if (!rgId && releases.length > 0) {
        // Try to get release group ID from the first release
        rgId = releases[0]['release-group']?.id
    }
    
    if (rgId) {
        urls.push(`https://coverartarchive.org/release-group/${rgId}/front-250`)
        urls.push(`https://coverartarchive.org/release-group/${rgId}/front-500`)
        urls.push(`https://coverartarchive.org/release-group/${rgId}/front`)
    }
    
    // Remove duplicates (in case same release appears multiple times)
    return Array.from(new Set(urls))
}

/**
 * Scores a release to determine how "original" it is.
 * Higher score = more likely to be the original release.
 * 
 * Prioritizes:
 * - Official status
 * - Album/Single/EP primary types
 * - Releases WITHOUT secondary types (Compilation, Soundtrack, etc.)
 * - Earlier release dates (original came first)
 */
function scoreRelease(release: MusicBrainzRelease): number {
    let score = 0
    
    const releaseGroup = release['release-group']
    const primaryType = releaseGroup?.['primary-type']
    const secondaryTypes = releaseGroup?.['secondary-types'] || []
    const status = release.status
    
    // Prefer official releases
    if (status === 'Official') score += 100
    else if (status === 'Promotion') score += 20
    // Bootleg gets 0
    
    // Primary type scoring - prefer albums and singles
    if (primaryType === 'Album') score += 50
    else if (primaryType === 'Single') score += 40
    else if (primaryType === 'EP') score += 30
    else if (primaryType === 'Broadcast') score += 10
    // Other types get 0
    
    // Penalize compilations, soundtracks, and other non-original releases heavily
    if (secondaryTypes.includes('Compilation')) score -= 200
    if (secondaryTypes.includes('Soundtrack')) score -= 150
    if (secondaryTypes.includes('Remix')) score -= 100
    if (secondaryTypes.includes('Live')) score -= 50
    if (secondaryTypes.includes('DJ-mix')) score -= 100
    if (secondaryTypes.includes('Mixtape/Street')) score -= 80
    if (secondaryTypes.includes('Spokenword')) score -= 60
    if (secondaryTypes.includes('Interview')) score -= 200
    if (secondaryTypes.includes('Audiobook')) score -= 200
    if (secondaryTypes.includes('Audio drama')) score -= 150
    
    // Prefer earlier releases (assuming original release came first)
    if (release.date) {
        const year = parseInt(release.date.substring(0, 4))
        if (!isNaN(year) && year > 1900 && year <= new Date().getFullYear()) {
            // Bonus for older releases: max 50 points for very old releases
            score += Math.min(50, Math.max(0, new Date().getFullYear() - year))
        }
    }
    
    return score
}

/**
 * Picks the best (most likely original) release from a list.
 * Uses scoring to prefer original albums over compilations/soundtracks.
 * 
 * @param releases - Array of MusicBrainz releases
 * @returns The best release, or null if array is empty
 */
export function pickBestRelease(releases: MusicBrainzRelease[] | undefined): MusicBrainzRelease | null {
    if (!releases || releases.length === 0) return null
    
    // If only one release, return it
    if (releases.length === 1) return releases[0]
    
    // Score and sort releases
    const scored = releases.map(r => ({ release: r, score: scoreRelease(r) }))
    scored.sort((a, b) => b.score - a.score)
    
    // Log top candidates for debugging
    console.log('=== Release Selection ===')
    console.log('Top 5 releases by score:')
    scored.slice(0, 5).forEach((s, i) => {
        const rg = s.release['release-group']
        console.log(`  ${i + 1}. "${s.release.title}" (${s.release.date || 'no date'})`)
        console.log(`     Type: ${rg?.['primary-type'] || 'unknown'}${rg?.['secondary-types']?.length ? ` + ${rg['secondary-types'].join(', ')}` : ''}`)
        console.log(`     Status: ${s.release.status || 'unknown'}, Score: ${s.score}`)
    })
    console.log(`Selected: "${scored[0].release.title}"`)
    console.log('========================')
    
    return scored[0].release
}