import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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
        seek: vi.fn()
    }))
}))

describe('Integration: Playlist Flow', () => {
    beforeEach(() => {
        vi.clearAllMocks()

        vi.mocked(window.electronAPI.getSettings).mockResolvedValue({
            musicFolderPath: '/music',
            downloadFolderPath: '/dl',
            scanSubfolders: true
        })

        vi.mocked(window.electronAPI.scanMusicFolder).mockResolvedValue([])


        // Mock Playlists
        vi.mocked(window.electronAPI.playlistGetAll).mockResolvedValue({
            success: true,
            playlists: []
        })

        vi.mocked(window.electronAPI.playlistCreate).mockResolvedValue({
            success: true,
            playlist: {
                id: 1,
                name: 'My Playlist',
                description: 'A test playlist',
                coverArtPath: null,
                songCount: 0,
                totalDuration: 0,
                createdAt: Date.now(),
                updatedAt: Date.now()
            }
        })
    })

    it('should create a new playlist', async () => {
        render(<App />)

        // Wait for load
        await waitFor(() => expect(window.electronAPI.getSettings).toHaveBeenCalled())

        // Find "New Playlist" button or "+" icon in Sidebar
        // Sidebar usually has a button for creating playlist.
        // Assuming it has text "New Playlist" or similar.
        // If icon, might need aria-label.

        // Let's assume there is a button with specific text/label.
        // Looking at codebase might be helpful but let's try generic search.
        const createBtn = screen.getByTitle('Create new playlist')
        fireEvent.click(createBtn)

        // Modal should appear
        // Modal should appear - check specific title
        expect(screen.getByText('Create New Playlist')).toBeInTheDocument()

        // Enter name using label
        const input = screen.getByLabelText('Playlist Name')
        fireEvent.change(input, { target: { value: 'My Playlist' } })

        // Click Create - scope to modal or use specific text
        // Button text is "Create Playlist", same as sidebar button potentially (inside span)
        const modal = screen.getByText('Create New Playlist').closest('.create-playlist-modal')
        // Use class selector for certainty or find button inside modal
        const submitBtn = modal?.querySelector('.create-button')
        expect(submitBtn).toBeTruthy()

        if (submitBtn) {
            fireEvent.click(submitBtn)
        }

        // Verify API call
        await waitFor(() => {
            expect(window.electronAPI.playlistCreate).toHaveBeenCalled()
            const args = vi.mocked(window.electronAPI.playlistCreate).mock.calls[0]
            expect(args[0]).toBe('My Playlist')
        })

        // Verify playlist appears in Sidebar
        // Our mock `playlistCreate` returns the playlist object. 
        // The App should update the list.
        await waitFor(() => {
            expect(screen.getByText('My Playlist')).toBeInTheDocument()
        })
    })
})
