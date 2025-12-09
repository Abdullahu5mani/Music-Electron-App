import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { delay, waitForAcoustID, waitForMusicBrainz, waitForCoverArt, waitBetweenSongs, API_DELAYS } from './rateLimiter'

describe('rateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('delay', () => {
    it('should wait for the specified milliseconds', async () => {
      const delayPromise = delay(100)
      
      vi.advanceTimersByTime(100)
      await delayPromise
      
      // Promise should resolve successfully (no assertion needed, await is sufficient)
    })
  })

  describe('waitForAcoustID', () => {
    it('should wait for ACOUSTID delay', async () => {
      const waitPromise = waitForAcoustID()
      vi.advanceTimersByTime(API_DELAYS.ACOUSTID)
      await waitPromise
      // Promise should resolve successfully
    })
  })

  describe('waitForMusicBrainz', () => {
    it('should wait for MUSICBRAINZ delay', async () => {
      const waitPromise = waitForMusicBrainz()
      vi.advanceTimersByTime(API_DELAYS.MUSICBRAINZ)
      await waitPromise
      // Promise should resolve successfully
    })
  })

  describe('waitForCoverArt', () => {
    it('should wait for COVERART delay', async () => {
      const waitPromise = waitForCoverArt()
      vi.advanceTimersByTime(API_DELAYS.COVERART)
      await waitPromise
      // Promise should resolve successfully
    })
  })

  describe('waitBetweenSongs', () => {
    it('should wait for BETWEEN_SONGS delay', async () => {
      const waitPromise = waitBetweenSongs()
      vi.advanceTimersByTime(API_DELAYS.BETWEEN_SONGS)
      await waitPromise
      // Promise should resolve successfully
    })
  })

  describe('API_DELAYS', () => {
    it('should have correct delay values', () => {
      expect(API_DELAYS.ACOUSTID).toBe(500)
      expect(API_DELAYS.MUSICBRAINZ).toBe(1100)
      expect(API_DELAYS.COVERART).toBe(1100)
      expect(API_DELAYS.BETWEEN_SONGS).toBe(500)
    })
  })
})

