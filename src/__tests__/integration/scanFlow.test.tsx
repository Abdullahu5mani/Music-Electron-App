import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import App from '../../App'

// Mock Howler simple stub to avoid errors
vi.mock('howler', () => ({
    Howl: vi.fn().mockImplementation(() => ({
        play: vi.fn(),
        pause: vi.fn(),
        stop: vi.fn(),
        unload: vi.fn(),
        volume: vi.fn(),
        seek: vi.fn(),
        duration: vi.fn(),
        playing: vi.fn(),
        state: vi.fn(),
        on: vi.fn()
    }))
}))

describe('Integration: Scan Flow', () => {
    const mockSongs = [
        {
            path: '/music/unknown.mp3',
            name: 'unknown.mp3',
            extension: '.mp3',
            size: 1000,
            metadata: { title: 'Unknown Title', artist: 'Unknown Artist', album: 'Unknown Album' }
        }
    ]

    beforeEach(() => {
        vi.clearAllMocks()

        vi.mocked(window.electronAPI.scanMusicFolder).mockResolvedValue(mockSongs as any)
        vi.mocked(window.electronAPI.getSettings).mockResolvedValue({
            musicFolderPath: '/music',
            downloadFolderPath: '/dl',
            scanSubfolders: true
        })
        vi.mocked(window.electronAPI.cacheGetBatchStatus).mockResolvedValue({})
    })

    it('should display scanned songs', async () => {
        render(<App />)

        await waitFor(() => {
            expect(screen.getByText('Unknown Title')).toBeInTheDocument()
        })
    })

    // TODO: Add test for Identify/Lyrics processing interactions
    // This requires clicking buttons in SongList which trigger electronAPI calls
})
