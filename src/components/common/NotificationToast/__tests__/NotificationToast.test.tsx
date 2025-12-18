/**
 * NotificationToast Component Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NotificationToast } from '../NotificationToast'

describe('NotificationToast', () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    describe('rendering', () => {
        it('should render the message when visible', () => {
            render(
                <NotificationToast
                    message="Test notification"
                    type="info"
                    isVisible={true}
                />
            )

            expect(screen.getByText('Test notification')).toBeInTheDocument()
        })

        it('should not render when not visible and timer expires', async () => {
            render(
                <NotificationToast
                    message="Test notification"
                    type="info"
                    isVisible={false}
                />
            )

            act(() => {
                vi.advanceTimersByTime(400) // Wait for fade-out animation
            })

            expect(screen.queryByText('Test notification')).not.toBeInTheDocument()
        })

        it('should render correct icon for success type', () => {
            render(
                <NotificationToast
                    message="Success!"
                    type="success"
                    isVisible={true}
                />
            )

            expect(screen.getByText('✓')).toBeInTheDocument()
        })

        it('should render correct icon for error type', () => {
            render(
                <NotificationToast
                    message="Error!"
                    type="error"
                    isVisible={true}
                />
            )

            expect(screen.getByText('✕')).toBeInTheDocument()
        })

        it('should render correct icon for warning type', () => {
            render(
                <NotificationToast
                    message="Warning!"
                    type="warning"
                    isVisible={true}
                />
            )

            expect(screen.getByText('⚠')).toBeInTheDocument()
        })

        it('should render correct icon for info type', () => {
            render(
                <NotificationToast
                    message="Info!"
                    type="info"
                    isVisible={true}
                />
            )

            expect(screen.getByText('ℹ')).toBeInTheDocument()
        })

        it('should apply the correct CSS class for the type', () => {
            const { container } = render(
                <NotificationToast
                    message="Test"
                    type="success"
                    isVisible={true}
                />
            )

            const toast = container.querySelector('.notification-toast')
            expect(toast).toHaveClass('success')
        })

        it('should apply visible class when isVisible is true', () => {
            const { container } = render(
                <NotificationToast
                    message="Test"
                    type="info"
                    isVisible={true}
                />
            )

            const toast = container.querySelector('.notification-toast')
            expect(toast).toHaveClass('visible')
        })
    })

    describe('auto-dismiss behavior', () => {
        it('should call onClose after duration expires', async () => {
            const onClose = vi.fn()

            render(
                <NotificationToast
                    message="Test"
                    type="info"
                    isVisible={true}
                    duration={3000}
                    onClose={onClose}
                />
            )

            expect(onClose).not.toHaveBeenCalled()

            act(() => {
                vi.advanceTimersByTime(3000)
            })

            expect(onClose).toHaveBeenCalledTimes(1)
        })

        it('should not auto-dismiss when duration is 0', () => {
            const onClose = vi.fn()

            render(
                <NotificationToast
                    message="Test"
                    type="info"
                    isVisible={true}
                    duration={0}
                    onClose={onClose}
                />
            )

            act(() => {
                vi.advanceTimersByTime(10000) // Wait a long time
            })

            expect(onClose).not.toHaveBeenCalled()
        })

        it('should use default duration of 3000ms', () => {
            const onClose = vi.fn()

            render(
                <NotificationToast
                    message="Test"
                    type="info"
                    isVisible={true}
                    onClose={onClose}
                />
            )

            act(() => {
                vi.advanceTimersByTime(2999)
            })
            expect(onClose).not.toHaveBeenCalled()

            act(() => {
                vi.advanceTimersByTime(1)
            })
            expect(onClose).toHaveBeenCalled()
        })
    })

    describe('close button', () => {
        it('should render close button when onClose is provided', () => {
            render(
                <NotificationToast
                    message="Test"
                    type="info"
                    isVisible={true}
                    onClose={() => { }}
                />
            )

            expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument()
        })

        it('should not render close button when onClose is not provided', () => {
            render(
                <NotificationToast
                    message="Test"
                    type="info"
                    isVisible={true}
                />
            )

            expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument()
        })

        it('should call onClose when close button is clicked', async () => {
            vi.useRealTimers() // Use real timers for user events
            const user = userEvent.setup()
            const onClose = vi.fn()

            render(
                <NotificationToast
                    message="Test"
                    type="info"
                    isVisible={true}
                    onClose={onClose}
                />
            )

            const closeButton = screen.getByRole('button', { name: /close/i })
            await user.click(closeButton)

            expect(onClose).toHaveBeenCalledTimes(1)
        })
    })

    describe('visibility transitions', () => {
        it('should re-render when visibility changes from false to true', () => {
            const { rerender } = render(
                <NotificationToast
                    message="Test"
                    type="info"
                    isVisible={false}
                />
            )

            act(() => {
                vi.advanceTimersByTime(400) // Wait for initial fade-out
            })

            expect(screen.queryByText('Test')).not.toBeInTheDocument()

            rerender(
                <NotificationToast
                    message="Test"
                    type="info"
                    isVisible={true}
                />
            )

            expect(screen.getByText('Test')).toBeInTheDocument()
        })
    })
})
