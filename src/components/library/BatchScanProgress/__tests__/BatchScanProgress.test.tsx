/**
 * BatchScanProgress Component Tests
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BatchScanProgress } from '../BatchScanProgress'

describe('BatchScanProgress', () => {
    const defaultProps = {
        isVisible: true,
        currentIndex: 5,
        totalCount: 20,
        currentSongName: 'Test Song.mp3',
    }

    describe('rendering', () => {
        it('should not render when isVisible is false', () => {
            const { container } = render(
                <BatchScanProgress {...defaultProps} isVisible={false} />
            )

            expect(container.querySelector('.batch-scan-progress')).not.toBeInTheDocument()
        })

        it('should render when isVisible is true', () => {
            const { container } = render(
                <BatchScanProgress {...defaultProps} isVisible={true} />
            )

            expect(container.querySelector('.batch-scan-progress')).toBeInTheDocument()
        })

        it('should display the scan title', () => {
            render(<BatchScanProgress {...defaultProps} />)

            expect(screen.getByText(/Scanning Library/)).toBeInTheDocument()
        })

        it('should display the current count and total', () => {
            render(<BatchScanProgress {...defaultProps} currentIndex={5} totalCount={20} />)

            expect(screen.getByText('5 of 20')).toBeInTheDocument()
        })

        it('should display the current song name', () => {
            render(<BatchScanProgress {...defaultProps} currentSongName="My Song.mp3" />)

            expect(screen.getByText('My Song.mp3')).toBeInTheDocument()
        })

        it('should truncate long song names', () => {
            const longName = 'A Very Very Very Very Long Song Name That Exceeds Thirty-Five Characters.mp3'
            render(<BatchScanProgress {...defaultProps} currentSongName={longName} />)

            // Should be truncated with ellipsis
            expect(screen.getByText(/\.\.\./)).toBeInTheDocument()
        })
    })

    describe('progress bar', () => {
        it('should render progress bar with correct percentage', () => {
            const { container } = render(
                <BatchScanProgress {...defaultProps} currentIndex={10} totalCount={20} />
            )

            const progressBar = container.querySelector('.batch-scan-bar-fill')
            expect(progressBar).toHaveStyle({ width: '50%' })
        })

        it('should show 0% when totalCount is 0', () => {
            const { container } = render(
                <BatchScanProgress {...defaultProps} currentIndex={0} totalCount={0} />
            )

            const progressBar = container.querySelector('.batch-scan-bar-fill')
            expect(progressBar).toHaveStyle({ width: '0%' })
        })

        it('should show 100% when currentIndex equals totalCount', () => {
            const { container } = render(
                <BatchScanProgress {...defaultProps} currentIndex={20} totalCount={20} />
            )

            const progressBar = container.querySelector('.batch-scan-bar-fill')
            expect(progressBar).toHaveStyle({ width: '100%' })
        })
    })

    describe('API phases', () => {
        it('should display AcoustID phase', () => {
            render(<BatchScanProgress {...defaultProps} apiPhase="acoustid" />)

            expect(screen.getByText(/AcoustID lookup/)).toBeInTheDocument()
        })

        it('should display MusicBrainz phase', () => {
            render(<BatchScanProgress {...defaultProps} apiPhase="musicbrainz" />)

            expect(screen.getByText(/MusicBrainz lookup/)).toBeInTheDocument()
        })

        it('should display Cover Art phase', () => {
            render(<BatchScanProgress {...defaultProps} apiPhase="coverart" />)

            expect(screen.getByText(/Cover Art lookup/)).toBeInTheDocument()
        })

        it('should display Writing phase', () => {
            render(<BatchScanProgress {...defaultProps} apiPhase="writing" />)

            expect(screen.getByText(/Writing metadata/)).toBeInTheDocument()
        })

        it('should not display phase when apiPhase is null', () => {
            render(<BatchScanProgress {...defaultProps} apiPhase={undefined} />)

            expect(screen.queryByText(/lookup/)).not.toBeInTheDocument()
            expect(screen.queryByText(/Writing/)).not.toBeInTheDocument()
        })
    })

    describe('cancel button', () => {
        it('should render cancel button when onCancel is provided', () => {
            const { container } = render(<BatchScanProgress {...defaultProps} onCancel={() => { }} />)

            const cancelButton = container.querySelector('.batch-scan-cancel')
            expect(cancelButton).toBeInTheDocument()
        })

        it('should not render cancel button when onCancel is not provided', () => {
            const { container } = render(<BatchScanProgress {...defaultProps} />)

            expect(container.querySelector('.batch-scan-cancel')).not.toBeInTheDocument()
        })

        it('should call onCancel when cancel button is clicked', async () => {
            const user = userEvent.setup()
            const onCancel = vi.fn()

            const { container } = render(<BatchScanProgress {...defaultProps} onCancel={onCancel} />)

            const cancelButton = container.querySelector('.batch-scan-cancel')
            if (cancelButton) {
                await user.click(cancelButton)
            }

            expect(onCancel).toHaveBeenCalledTimes(1)
        })
    })

    describe('edge cases', () => {
        it('should handle 0 total count gracefully', () => {
            expect(() => {
                render(<BatchScanProgress {...defaultProps} totalCount={0} currentIndex={0} />)
            }).not.toThrow()
        })

        it('should handle currentIndex greater than totalCount', () => {
            const { container } = render(
                <BatchScanProgress {...defaultProps} currentIndex={25} totalCount={20} />
            )

            // Should show > 100% (125%)
            const progressBar = container.querySelector('.batch-scan-bar-fill')
            expect(progressBar).toHaveStyle({ width: '125%' })
        })

        it('should handle empty song name', () => {
            render(<BatchScanProgress {...defaultProps} currentSongName="" />)

            // Should not throw
            expect(screen.getByText('5 of 20')).toBeInTheDocument()
        })
    })
})
