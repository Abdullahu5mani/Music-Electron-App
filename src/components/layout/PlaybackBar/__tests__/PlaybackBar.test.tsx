/**
 * PlaybackBar Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PlaybackBar } from '../PlaybackBar'
import type { MusicFile } from '../../../../../electron/musicScanner'

// Mock the rc-slider component
vi.mock('rc-slider', () => ({
    default: ({ value, onChange, onAfterChange, ...props }: any) => (
        <input
            type="range"
            value={value}
            onChange={(e) => onChange?.(Number(e.target.value))}
            onMouseUp={(e) => onAfterChange?.(Number((e.target as HTMLInputElement).value))}
            data-testid={props['data-testid'] || 'slider'}
            {...props}
        />
    ),
}))

// Mock the AudioVisualizer
vi.mock('../../../common/AudioVisualizer/AudioVisualizer', () => ({
    AudioVisualizer: ({ mode }: { mode: string }) => (
        <div data-testid="audio-visualizer" data-mode={mode} />
    ),
}))

// Mock extractColorsFromImage
vi.mock('../../../../utils/colorExtractor', () => ({
    extractColorsFromImage: vi.fn().mockResolvedValue({
        primary: '#667eea',
        secondary: '#764ba2',
        accent: '#f093fb',
        background: '#1a1a2e',
    }),
}))

const mockSong: MusicFile = {
    path: '/path/to/song.mp3',
    name: 'song.mp3',
    extension: '.mp3',
    size: 5000000,
    metadata: {
        title: 'Test Song',
        artist: 'Test Artist',
        album: 'Test Album',
        duration: 200,
        albumArt: 'data:image/png;base64,test',
    },
}

describe('PlaybackBar', () => {
    const defaultProps = {
        currentSong: mockSong,
        isPlaying: false,
        onPlayPause: vi.fn(),
        onNext: vi.fn(),
        onPrevious: vi.fn(),
        shuffle: false,
        repeatMode: 'off' as const,
        onToggleShuffle: vi.fn(),
        onCycleRepeatMode: vi.fn(),
        currentTime: 60,
        duration: 200,
        onSeek: vi.fn(),
        volume: 0.5,
        onVolumeChange: vi.fn(),
        visualizerMode: 'bars' as const,
    }

    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('rendering', () => {
        it('should render the playback bar', () => {
            const { container } = render(<PlaybackBar {...defaultProps} />)
            expect(container.querySelector('.playback-bar')).toBeInTheDocument()
        })

        it('should display song title', () => {
            render(<PlaybackBar {...defaultProps} />)
            expect(screen.getByText('Test Song')).toBeInTheDocument()
        })

        it('should display artist name', () => {
            render(<PlaybackBar {...defaultProps} />)
            expect(screen.getByText('Test Artist')).toBeInTheDocument()
        })

        it('should display "No song selected" when no current song', () => {
            render(<PlaybackBar {...defaultProps} currentSong={null} />)
            expect(screen.getByText('No song selected')).toBeInTheDocument()
        })

        it('should display album art when available', () => {
            const { container } = render(<PlaybackBar {...defaultProps} />)
            const img = container.querySelector('.playback-art')
            expect(img).toBeInTheDocument()
        })

        it('should display placeholder when no album art', () => {
            const songWithoutArt: MusicFile = {
                ...mockSong,
                metadata: { ...mockSong.metadata, albumArt: undefined },
            }
            const { container } = render(<PlaybackBar {...defaultProps} currentSong={songWithoutArt} />)
            const placeholder = container.querySelector('.playback-art-placeholder')
            expect(placeholder).toBeInTheDocument()
        })
    })

    describe('playback controls', () => {
        it('should call onPlayPause when play button is clicked', async () => {
            const user = userEvent.setup()
            const onPlayPause = vi.fn()

            render(<PlaybackBar {...defaultProps} onPlayPause={onPlayPause} />)

            const playButton = screen.getByLabelText(/play/i)
            await user.click(playButton)

            expect(onPlayPause).toHaveBeenCalledTimes(1)
        })

        it('should call onNext when next button is clicked', async () => {
            const user = userEvent.setup()
            const onNext = vi.fn()

            render(<PlaybackBar {...defaultProps} onNext={onNext} />)

            const nextButton = screen.getByLabelText(/next/i)
            await user.click(nextButton)

            expect(onNext).toHaveBeenCalledTimes(1)
        })

        it('should call onPrevious when previous button is clicked', async () => {
            const user = userEvent.setup()
            const onPrevious = vi.fn()

            render(<PlaybackBar {...defaultProps} onPrevious={onPrevious} />)

            const prevButton = screen.getByLabelText(/previous/i)
            await user.click(prevButton)

            expect(onPrevious).toHaveBeenCalledTimes(1)
        })
    })

    describe('shuffle and repeat', () => {
        it('should call onToggleShuffle when shuffle button is clicked', async () => {
            const user = userEvent.setup()
            const onToggleShuffle = vi.fn()

            render(<PlaybackBar {...defaultProps} onToggleShuffle={onToggleShuffle} />)

            const shuffleButton = screen.getByLabelText(/shuffle/i)
            await user.click(shuffleButton)

            expect(onToggleShuffle).toHaveBeenCalledTimes(1)
        })

        it('should highlight shuffle button when shuffle is enabled', () => {
            const { container } = render(<PlaybackBar {...defaultProps} shuffle={true} />)
            const shuffleButton = container.querySelector('.control-button.active')
            expect(shuffleButton).toBeInTheDocument()
        })

        it('should call onCycleRepeatMode when repeat button is clicked', async () => {
            const user = userEvent.setup()
            const onCycleRepeatMode = vi.fn()

            render(<PlaybackBar {...defaultProps} onCycleRepeatMode={onCycleRepeatMode} />)

            const repeatButton = screen.getByLabelText(/repeat/i)
            await user.click(repeatButton)

            expect(onCycleRepeatMode).toHaveBeenCalledTimes(1)
        })
    })

    describe('time display', () => {
        it('should display current time in MM:SS format', () => {
            render(<PlaybackBar {...defaultProps} currentTime={90} />)
            expect(screen.getByText('1:30')).toBeInTheDocument()
        })

        it('should display duration in MM:SS format', () => {
            render(<PlaybackBar {...defaultProps} duration={300} />)
            expect(screen.getByText('5:00')).toBeInTheDocument()
        })

        it('should display 0:00 for zero times', () => {
            render(<PlaybackBar {...defaultProps} currentTime={0} duration={0} />)
            const zeroTimes = screen.getAllByText('0:00')
            expect(zeroTimes.length).toBeGreaterThanOrEqual(1)
        })
    })

    describe('volume control', () => {
        it('should render volume slider', () => {
            const { container } = render(<PlaybackBar {...defaultProps} />)
            const volumeSlider = container.querySelector('.volume-slider')
            expect(volumeSlider).toBeInTheDocument()
        })
    })

    describe('disabled state', () => {
        it('should disable controls when no song is selected', () => {
            render(<PlaybackBar {...defaultProps} currentSong={null} />)

            const playButton = screen.getByLabelText(/play/i)
            const nextButton = screen.getByLabelText(/next/i)
            const prevButton = screen.getByLabelText(/previous/i)

            expect(playButton).toBeDisabled()
            expect(nextButton).toBeDisabled()
            expect(prevButton).toBeDisabled()
        })
    })

    describe('audio visualizer', () => {
        it('should render audio visualizer with correct mode', () => {
            render(<PlaybackBar {...defaultProps} isPlaying={true} currentSound={{} as any} visualizerMode="bars" />)

            const visualizer = screen.getByTestId('audio-visualizer')
            expect(visualizer).toHaveAttribute('data-mode', 'bars')
        })

        it('should render visualizer with "off" mode', () => {
            render(<PlaybackBar {...defaultProps} isPlaying={true} currentSound={{} as any} visualizerMode="off" />)

            const visualizer = screen.getByTestId('audio-visualizer')
            expect(visualizer).toHaveAttribute('data-mode', 'off')
        })
    })

    describe('playback context', () => {
        it('should display playback context name when provided', () => {
            render(<PlaybackBar {...defaultProps} playbackContextName="My Playlist" />)

            expect(screen.getByText(/My Playlist/)).toBeInTheDocument()
        })
    })
})
