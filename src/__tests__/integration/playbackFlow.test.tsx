import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from '../../App'
import { Howl } from 'howler'

// Mock Howler
vi.mock('howler', () => {
    return {
        Howl: vi.fn()
    }
})

describe.skip('Integration: Playback Flow', () => {
    const mockSongs = [
        {
            path: '/music/song1.mp3',
            name: 'Song One.mp3',
            extension: '.mp3',
            size: 1000,
            metadata: { title: 'Song One', artist: 'Artist One', album: 'Album One', duration: 180 }
        },
        {
            path: '/music/song2.mp3',
            name: 'Song Two.mp3',
            extension: '.mp3',
            size: 1000,
            metadata: { title: 'Song Two', artist: 'Artist Two', album: 'Album One', duration: 200 }
        }
    ]

    let howlMockInstance: any

    beforeEach(() => {
        vi.clearAllMocks()

        howlMockInstance = {
            play: vi.fn(),
            pause: vi.fn(),
            stop: vi.fn(),
            unload: vi.fn(),
            volume: vi.fn(),
            seek: vi.fn(),
            duration: vi.fn(() => 180),
            playing: vi.fn(() => false),
            state: vi.fn(() => 'loaded'),
        }

        // Setup Howl mock to use our instance and trigger callbacks
        vi.mocked(Howl).mockImplementation((config: any) => {
            // Trigger onload immediately to simulate loaded state
            if (config.onload) {
                setTimeout(() => config.onload(), 0)
            }

            // Hook play to trigger onplay
            howlMockInstance.play.mockImplementation(() => {
                howlMockInstance.playing.mockReturnValue(true)
                if (config.onplay) config.onplay()
            })

            // Hook pause
            howlMockInstance.pause.mockImplementation(() => {
                howlMockInstance.playing.mockReturnValue(false)
            })

            return howlMockInstance
        })

        // Setup Electron mock to return songs
        vi.mocked(window.electronAPI.scanMusicFolder).mockResolvedValue(mockSongs as any)

        // Mock getSettings
        vi.mocked(window.electronAPI.getSettings).mockResolvedValue({
            musicFolderPath: '/music',
            downloadFolderPath: '/downloads',
            scanSubfolders: true
        })

        // Mock cache
        vi.mocked(window.electronAPI.cacheGetBatchStatus).mockResolvedValue({})
    })

    it('should load songs and play a song when clicked', async () => {
        render(<App />)

        // Wait for songs to appear (mock scanner triggered by getSettings path)
        await waitFor(() => {
            expect(screen.getByText('Song One')).toBeInTheDocument()
            expect(screen.getByText('Song Two')).toBeInTheDocument()
        })

        // Click first song
        const songOne = screen.getByText('Song One')
        fireEvent.click(songOne)

        // Verify Howl instantiated
        await waitFor(() => {
            expect(Howl).toHaveBeenCalled()
        })

        // Verify playback started
        expect(howlMockInstance.play).toHaveBeenCalled()

        // Verify playback bar shows song info
        expect(screen.getByText('Song One')).toBeInTheDocument()
        expect(screen.getByText('Artist One')).toBeInTheDocument()
    })

    it('should toggle play/pause', async () => {
        render(<App />)

        // Load songs
        await waitFor(() => screen.getByText('Song One'))

        // Play song
        fireEvent.click(screen.getByText('Song One'))
        await waitFor(() => expect(howlMockInstance.play).toHaveBeenCalled())

        // Find play/pause button in PlaybackBar (it usually has an aria-label or icon)
        // Assuming PlaybackBar renders controls. Need to identify them.
        // We can search by title "Pause" since it should be playing.

        const pauseButton = await screen.findByTitle('Pause')
        fireEvent.click(pauseButton)

        expect(howlMockInstance.pause).toHaveBeenCalled()

        const playButton = await screen.findByTitle('Play')
        fireEvent.click(playButton)

        expect(howlMockInstance.play).toHaveBeenCalledTimes(2)
    })

    it('should play next song when next button clicked', async () => {
        render(<App />)
        await waitFor(() => screen.getByText('Song One'))

        // Play first song
        fireEvent.click(screen.getByText('Song One'))
        await waitFor(() => expect(Howl).toHaveBeenCalled())

        // Click next button
        const nextButton = await screen.findByTitle('Next')
        fireEvent.click(nextButton)

        // Verify new Howl instance created for second song
        // Howl should have been called twice (once for first song, once for second)
        // Or same instance reused? App logic creates NEW Howl for new song.
        await waitFor(() => {
            expect(Howl).toHaveBeenCalledTimes(2)
        })

        // Verify UI shows Song Two
        // The previous verify might pass too early if titles are present in list.
        // We check "Song Two" is highlighted or in PlaybackBar.
        // PlaybackTitle is usually distinct.
        // Let's check logic calls.

        // The last call to Howl should be for Song Two
        const lastCallArgs = vi.mocked(Howl).mock.lastCall?.[0] as any
        expect(lastCallArgs.src[0]).toContain('song2.mp3') // Converted to file:// URL
    })
})
