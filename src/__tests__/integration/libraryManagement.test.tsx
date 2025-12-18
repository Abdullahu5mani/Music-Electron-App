import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import App from '../../App'

// Stub Howler
vi.mock('howler', () => ({
    Howl: vi.fn().mockImplementation(() => ({
        play: vi.fn(),
        pause: vi.fn(),
        state: vi.fn(),
        on: vi.fn(),
        stop: vi.fn(),
        unload: vi.fn(),
        duration: vi.fn(),
        seek: vi.fn(),
        volume: vi.fn()
    }))
}))

describe('Integration: Library Management', () => {
    const mockSongs = [
        {
            path: '/music/song1.mp3',
            name: 'song1.mp3',
            extension: '.mp3',
            size: 1000,
            metadata: { title: 'Cecelia', artist: 'Zion', album: 'Album A', duration: 100, track: 1 },
            birthtime: new Date('2023-01-01').getTime()
        },
        {
            path: '/music/song2.mp3',
            name: 'song2.mp3',
            extension: '.mp3',
            size: 1000,
            metadata: { title: 'Amanda', artist: 'Yacht', album: 'Album B', duration: 200, track: 2 },
            birthtime: new Date('2023-01-02').getTime()
        },
        {
            path: '/music/song3.mp3',
            name: 'song3.mp3',
            extension: '.mp3',
            size: 1000,
            metadata: { title: 'Barbara', artist: 'Xylophone', album: 'Album C', duration: 300, track: 3 },
            birthtime: new Date('2023-01-03').getTime()
        }
    ]

    beforeEach(() => {
        vi.clearAllMocks()

        vi.mocked(window.electronAPI.getSettings).mockResolvedValue({
            musicFolderPath: '/music',
            downloadFolderPath: '/dl',
            scanSubfolders: true
        })

        // Return our mock songs
        vi.mocked(window.electronAPI.scanMusicFolder).mockResolvedValue(mockSongs as any)
        vi.mocked(window.electronAPI.cacheGetBatchStatus).mockResolvedValue({})

        // Mock Playlists empty
        vi.mocked(window.electronAPI.playlistGetAll).mockResolvedValue({ success: true, playlists: [] })
    })

    it('should sort songs by title', async () => {
        render(<App />)

        // Wait for songs to load
        await waitFor(() => {
            expect(screen.getByText('Cecelia')).toBeInTheDocument()
        })

        // Find Sort Dropdown
        const sortSelect = screen.getByLabelText(/Sort by/i)

        // Select Title (defaults might vary, ensure we change it)
        fireEvent.change(sortSelect, { target: { value: 'title' } })

        // Verify order: Amanda (A), Barbara (B), Cecelia (C)
        // Get all song items
        const songItems = screen.getAllByRole('listitem')
        // Filter to those containing song info (might pick up sidebar items if they are listitems? Sidebar uses buttons/divs usually, SongList uses ul/li)

        // Verify text content order
        // We can look index of text in document body, or check list items

        // Check finding within list items
        const first = within(songItems[0]).getByText('Amanda')
        const second = within(songItems[1]).getByText('Barbara')
        const third = within(songItems[2]).getByText('Cecelia')

        expect(first).toBeInTheDocument()
        expect(second).toBeInTheDocument()
        expect(third).toBeInTheDocument()
    })

    it('should filter songs by search', async () => {
        render(<App />)
        await waitFor(() => expect(screen.getByText('Cecelia')).toBeInTheDocument())

        // Find search input
        const searchInput = screen.getByPlaceholderText(/Search/i)

        // Type "Zion" (Artist of Cecelia)
        fireEvent.change(searchInput, { target: { value: 'Zion' } })

        // Verify Amanda and Barbara are gone, Cecelia remains
        expect(screen.getByText('Cecelia')).toBeInTheDocument()
        expect(screen.queryByText('Amanda')).not.toBeInTheDocument()
        expect(screen.queryByText('Barbara')).not.toBeInTheDocument()
    })
})
