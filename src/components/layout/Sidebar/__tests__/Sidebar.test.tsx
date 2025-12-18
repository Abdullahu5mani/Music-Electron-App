/**
 * Sidebar Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Sidebar } from '../Sidebar'
import type { Playlist } from '../../../../types/electron.d'

// Mock the PlaylistList component
vi.mock('../../../playlists', () => ({
    PlaylistList: ({
        playlists,
        onPlaylistClick,
        onCreateNew
    }: {
        playlists: Playlist[]
        onPlaylistClick?: (id: number) => void
        onCreateNew?: () => void
        onDeletePlaylist?: (id: number) => void
    }) => (
        <div data-testid="playlist-list">
            {playlists.map(p => (
                <button
                    key={p.id}
                    onClick={() => onPlaylistClick?.(p.id)}
                    data-testid={`playlist-${p.id}`}
                >
                    {p.name}
                </button>
            ))}
            <button onClick={onCreateNew} data-testid="create-playlist">Create</button>
        </div>
    )
}))

const mockMusicFiles = [
    { metadata: { artist: 'Artist A', album: 'Album 1', albumArt: 'art1.jpg' } },
    { metadata: { artist: 'Artist A', album: 'Album 2', albumArt: 'art2.jpg' } },
    { metadata: { artist: 'Artist B', album: 'Album 1' } },
    { metadata: { artist: 'Artist C', album: 'Album 3', albumArt: 'art3.jpg' } },
]

const mockPlaylists: Playlist[] = [
    { id: 1, name: 'Favorites', description: null, coverArtPath: null, songCount: 10, totalDuration: 3000, createdAt: Date.now(), updatedAt: Date.now() },
    { id: 2, name: 'Workout', description: 'Gym playlist', coverArtPath: null, songCount: 5, totalDuration: 1500, createdAt: Date.now(), updatedAt: Date.now() },
]

describe('Sidebar', () => {
    const defaultProps = {
        selectedView: 'all',
        onViewChange: vi.fn(),
        musicFiles: mockMusicFiles,
    }

    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('rendering', () => {
        it('should render the sidebar container', () => {
            const { container } = render(<Sidebar {...defaultProps} />)
            expect(container.querySelector('.sidebar')).toBeInTheDocument()
        })

        it('should render All Songs button', () => {
            render(<Sidebar {...defaultProps} />)
            expect(screen.getByText('All Songs')).toBeInTheDocument()
        })

        it('should render Playlists section', () => {
            render(<Sidebar {...defaultProps} />)
            expect(screen.getByText('Playlists')).toBeInTheDocument()
        })

        it('should render Artists section with count', () => {
            render(<Sidebar {...defaultProps} />)
            // 3 unique artists: A, B, C
            expect(screen.getByText('Artists (3)')).toBeInTheDocument()
        })

        it('should render Albums section with count', () => {
            render(<Sidebar {...defaultProps} />)
            // 3 unique albums: Album 1, Album 2, Album 3
            expect(screen.getByText('Albums (3)')).toBeInTheDocument()
        })

        it('should not render Artists section if no artists', () => {
            render(<Sidebar {...defaultProps} musicFiles={[]} />)
            expect(screen.queryByText(/Artists/)).not.toBeInTheDocument()
        })

        it('should not render Albums section if no albums', () => {
            render(<Sidebar {...defaultProps} musicFiles={[]} />)
            expect(screen.queryByText(/Albums/)).not.toBeInTheDocument()
        })
    })

    describe('All Songs button', () => {
        it('should have active class when selectedView is "all"', () => {
            render(<Sidebar {...defaultProps} selectedView="all" />)
            const allSongsButton = screen.getByText('All Songs').closest('button')
            expect(allSongsButton).toHaveClass('active')
        })

        it('should call onViewChange with "all" when clicked', async () => {
            const user = userEvent.setup()
            const onViewChange = vi.fn()

            render(<Sidebar {...defaultProps} onViewChange={onViewChange} />)

            await user.click(screen.getByText('All Songs'))

            expect(onViewChange).toHaveBeenCalledWith('all')
        })
    })

    describe('Artist selection', () => {
        it('should display all unique artists', () => {
            render(<Sidebar {...defaultProps} />)
            expect(screen.getByText('Artist A')).toBeInTheDocument()
            expect(screen.getByText('Artist B')).toBeInTheDocument()
            expect(screen.getByText('Artist C')).toBeInTheDocument()
        })

        it('should call onViewChange with artist when clicked', async () => {
            const user = userEvent.setup()
            const onViewChange = vi.fn()

            render(<Sidebar {...defaultProps} onViewChange={onViewChange} />)

            await user.click(screen.getByText('Artist A'))

            expect(onViewChange).toHaveBeenCalledWith('artist:Artist A')
        })

        it('should highlight selected artist', () => {
            render(<Sidebar {...defaultProps} selectedView="artist:Artist A" />)
            const artistButton = screen.getByText('Artist A').closest('button')
            expect(artistButton).toHaveClass('active')
        })
    })

    describe('Album selection', () => {
        it('should display all unique albums', () => {
            render(<Sidebar {...defaultProps} />)
            expect(screen.getByText('Album 1')).toBeInTheDocument()
            expect(screen.getByText('Album 2')).toBeInTheDocument()
            expect(screen.getByText('Album 3')).toBeInTheDocument()
        })

        it('should call onViewChange with album when clicked', async () => {
            const user = userEvent.setup()
            const onViewChange = vi.fn()

            render(<Sidebar {...defaultProps} onViewChange={onViewChange} />)

            await user.click(screen.getByText('Album 1'))

            expect(onViewChange).toHaveBeenCalledWith('album:Album 1')
        })

        it('should show album art thumbnail when available', () => {
            const { container } = render(<Sidebar {...defaultProps} />)
            const thumbnails = container.querySelectorAll('.album-thumb')
            expect(thumbnails.length).toBeGreaterThan(0)
        })
    })

    describe('collapsible sections', () => {
        it('should collapse Playlists section when title is clicked', async () => {
            const user = userEvent.setup()
            render(<Sidebar {...defaultProps} />)

            // Playlists is initially expanded
            expect(screen.getByText('All Songs')).toBeVisible()

            // Click to collapse
            await user.click(screen.getByText('Playlists'))

            // The section should have collapsed class
            const section = screen.getByText('Playlists').closest('.sidebar-section')
            expect(section).toHaveClass('collapsed')
        })

        it('should collapse Artists section when title is clicked', async () => {
            const user = userEvent.setup()
            render(<Sidebar {...defaultProps} />)

            await user.click(screen.getByText('Artists (3)'))

            const section = screen.getByText('Artists (3)').closest('.sidebar-section')
            expect(section).toHaveClass('collapsed')
        })

        it('should expand collapsed section when title is clicked again', async () => {
            const user = userEvent.setup()
            render(<Sidebar {...defaultProps} />)

            // Collapse
            await user.click(screen.getByText('Artists (3)'))

            // Expand
            await user.click(screen.getByText('Artists (3)'))

            const section = screen.getByText('Artists (3)').closest('.sidebar-section')
            expect(section).toHaveClass('expanded')
        })
    })

    describe('search functionality', () => {
        it('should show artist search when there are more than 5 artists', () => {
            const manyArtists = Array.from({ length: 10 }, (_, i) => ({
                metadata: { artist: `Artist ${i}`, album: `Album ${i}` }
            }))

            render(<Sidebar {...defaultProps} musicFiles={manyArtists} />)

            expect(screen.getByPlaceholderText('Search artists...')).toBeInTheDocument()
        })

        it('should filter artists based on search input', async () => {
            const user = userEvent.setup()
            const manyArtists = Array.from({ length: 10 }, (_, i) => ({
                metadata: { artist: `Artist ${i}`, album: `Album ${i}` }
            }))

            render(<Sidebar {...defaultProps} musicFiles={manyArtists} />)

            const searchInput = screen.getByPlaceholderText('Search artists...')
            await user.type(searchInput, 'Artist 1')

            // Should show Artist 1 but not Artist 2, 3, etc.
            expect(screen.getByText('Artist 1')).toBeInTheDocument()
            expect(screen.queryByText('Artist 2')).not.toBeInTheDocument()
        })

        it('should show "No artists found" when search has no results', async () => {
            const user = userEvent.setup()
            const manyArtists = Array.from({ length: 10 }, (_, i) => ({
                metadata: { artist: `Artist ${i}`, album: `Album ${i}` }
            }))

            render(<Sidebar {...defaultProps} musicFiles={manyArtists} />)

            const searchInput = screen.getByPlaceholderText('Search artists...')
            await user.type(searchInput, 'nonexistent')

            expect(screen.getByText('No artists found')).toBeInTheDocument()
        })
    })

    describe('playlists', () => {
        it('should render playlist items', () => {
            render(<Sidebar {...defaultProps} playlists={mockPlaylists} />)

            expect(screen.getByText('Favorites')).toBeInTheDocument()
            expect(screen.getByText('Workout')).toBeInTheDocument()
        })

        it('should call onPlaylistClick when playlist is clicked', async () => {
            const user = userEvent.setup()
            const onPlaylistClick = vi.fn()
            const onViewChange = vi.fn()

            render(
                <Sidebar
                    {...defaultProps}
                    playlists={mockPlaylists}
                    onPlaylistClick={onPlaylistClick}
                    onViewChange={onViewChange}
                />
            )

            await user.click(screen.getByTestId('playlist-1'))

            expect(onPlaylistClick).toHaveBeenCalledWith(1)
            expect(onViewChange).toHaveBeenCalledWith('playlist:1')
        })
    })
})
