import { describe, it, expect } from 'vitest'
import { getCoverArtUrl, getCoverArtUrls, pickBestRelease } from '../musicbrainz'
import type { MusicBrainzRelease } from '../musicbrainz'

describe('musicbrainzClient', () => {
  describe('getCoverArtUrl', () => {
    it('should generate correct cover art URL for a release', () => {
      const mbid = '12345678-1234-1234-1234-123456789012'
      const url = getCoverArtUrl(mbid)
      expect(url).toBe(`https://coverartarchive.org/release/${mbid}/front-250`)
    })
  })

  describe('getCoverArtUrls', () => {
    it('should generate URLs for multiple releases with fallbacks', () => {
      const releases: MusicBrainzRelease[] = [
        {
          id: 'release-1',
          title: 'Album 1',
          'release-group': {
            id: 'rg-1',
            title: 'Album 1',
            'primary-type': 'Album',
          },
        },
        {
          id: 'release-2',
          title: 'Album 2',
          'release-group': {
            id: 'rg-1',
            title: 'Album 1',
            'primary-type': 'Album',
          },
        },
      ]

      const urls = getCoverArtUrls(releases, 'rg-1')

      // Should have 250px, 500px, and original for each release, plus release group fallbacks
      expect(urls).toContain('https://coverartarchive.org/release/release-1/front-250')
      expect(urls).toContain('https://coverartarchive.org/release/release-1/front-500')
      expect(urls).toContain('https://coverartarchive.org/release/release-1/front')
      expect(urls).toContain('https://coverartarchive.org/release/release-2/front-250')
      expect(urls).toContain('https://coverartarchive.org/release-group/rg-1/front-250')
    })

    it('should handle empty releases array with release group', () => {
      const urls = getCoverArtUrls([], 'rg-1')
      expect(urls).toEqual([
        'https://coverartarchive.org/release-group/rg-1/front-250',
        'https://coverartarchive.org/release-group/rg-1/front-500',
        'https://coverartarchive.org/release-group/rg-1/front',
      ])
    })

    it('should extract release group from first release if not provided', () => {
      const releases: MusicBrainzRelease[] = [
        {
          id: 'release-1',
          title: 'Album 1',
          'release-group': {
            id: 'rg-1',
            title: 'Album 1',
            'primary-type': 'Album',
          },
        },
      ]

      const urls = getCoverArtUrls(releases)
      expect(urls).toContain('https://coverartarchive.org/release-group/rg-1/front-250')
    })

    it('should remove duplicate URLs', () => {
      const releases: MusicBrainzRelease[] = [
        {
          id: 'release-1',
          title: 'Album 1',
          'release-group': {
            id: 'rg-1',
            title: 'Album 1',
            'primary-type': 'Album',
          },
        },
        {
          id: 'release-1', // Same ID
          title: 'Album 1',
          'release-group': {
            id: 'rg-1',
            title: 'Album 1',
            'primary-type': 'Album',
          },
        },
      ]

      const urls = getCoverArtUrls(releases)
      const uniqueUrls = new Set(urls)
      expect(urls.length).toBe(uniqueUrls.size)
    })
  })

  describe('pickBestRelease', () => {
    it('should return null for empty array', () => {
      expect(pickBestRelease([])).toBeNull()
      expect(pickBestRelease(undefined)).toBeNull()
    })

    it('should return single release if only one exists', () => {
      const release: MusicBrainzRelease = {
        id: 'release-1',
        title: 'Album',
      }
      expect(pickBestRelease([release])).toBe(release)
    })

    it('should prefer official releases over bootlegs', () => {
      const releases: MusicBrainzRelease[] = [
        {
          id: 'bootleg',
          title: 'Bootleg Album',
          status: 'Bootleg',
          'release-group': {
            id: 'rg-1',
            title: 'Bootleg Album',
            'primary-type': 'Album',
          },
        },
        {
          id: 'official',
          title: 'Official Album',
          status: 'Official',
          'release-group': {
            id: 'rg-2',
            title: 'Official Album',
            'primary-type': 'Album',
          },
        },
      ]

      const best = pickBestRelease(releases)
      expect(best?.id).toBe('official')
    })

    it('should prefer albums over compilations', () => {
      const releases: MusicBrainzRelease[] = [
        {
          id: 'compilation',
          title: 'Greatest Hits',
          status: 'Official',
          'release-group': {
            id: 'rg-1',
            title: 'Greatest Hits',
            'primary-type': 'Album',
            'secondary-types': ['Compilation'],
          },
        },
        {
          id: 'album',
          title: 'Original Album',
          status: 'Official',
          date: '2010-01-01',
          'release-group': {
            id: 'rg-2',
            title: 'Original Album',
            'primary-type': 'Album',
          },
        },
      ]

      const best = pickBestRelease(releases)
      expect(best?.id).toBe('album')
    })

    it('should prefer earlier releases', () => {
      const releases: MusicBrainzRelease[] = [
        {
          id: 'reissue',
          title: 'Album',
          status: 'Official',
          date: '2020-01-01',
          'release-group': {
            id: 'rg-1',
            title: 'Album',
            'primary-type': 'Album',
          },
        },
        {
          id: 'original',
          title: 'Album',
          status: 'Official',
          date: '2010-01-01',
          'release-group': {
            id: 'rg-1',
            title: 'Album',
            'primary-type': 'Album',
          },
        },
      ]

      const best = pickBestRelease(releases)
      expect(best?.id).toBe('original')
    })

    it('should prefer singles over EPs when both are official', () => {
      const releases: MusicBrainzRelease[] = [
        {
          id: 'ep',
          title: 'EP',
          status: 'Official',
          'release-group': {
            id: 'rg-1',
            title: 'EP',
            'primary-type': 'EP',
          },
        },
        {
          id: 'single',
          title: 'Single',
          status: 'Official',
          'release-group': {
            id: 'rg-2',
            title: 'Single',
            'primary-type': 'Single',
          },
        },
      ]

      const best = pickBestRelease(releases)
      expect(best?.id).toBe('single')
    })
  })
})

