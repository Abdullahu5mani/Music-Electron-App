/**
 * TitleBar Component Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TitleBar } from '../TitleBar'

// Mock window.electronAPI
const mockElectronAPI = {
    minimizeWindow: vi.fn(),
    maximizeWindow: vi.fn(),
    closeWindow: vi.fn(),
    onWindowStateChanged: vi.fn((_callback: (maximized: boolean) => void) => {
        // Return cleanup function
        return () => { }
    }),
}

beforeEach(() => {
    vi.clearAllMocks()
    // @ts-expect-error - mocking window.electronAPI
    window.electronAPI = mockElectronAPI
})

afterEach(() => {
    // @ts-expect-error - clean up mock
    delete window.electronAPI
})

describe('TitleBar', () => {
    describe('rendering', () => {
        it('should render the app title', () => {
            render(<TitleBar />)

            expect(screen.getByText('Music Sync App')).toBeInTheDocument()
        })

        it('should render the app icon', () => {
            render(<TitleBar />)

            const icon = screen.getByAltText('Music Sync App')
            expect(icon).toBeInTheDocument()
            expect(icon).toHaveClass('title-icon')
        })

        it('should render minimize button', () => {
            render(<TitleBar />)

            expect(screen.getByRole('button', { name: /minimize/i })).toBeInTheDocument()
        })

        it('should render maximize button', () => {
            render(<TitleBar />)

            expect(screen.getByRole('button', { name: /maximize/i })).toBeInTheDocument()
        })

        it('should render close button', () => {
            render(<TitleBar />)

            expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument()
        })

        it('should have proper CSS classes', () => {
            const { container } = render(<TitleBar />)

            expect(container.querySelector('.title-bar')).toBeInTheDocument()
            expect(container.querySelector('.title-bar-content')).toBeInTheDocument()
            expect(container.querySelector('.title-bar-controls')).toBeInTheDocument()
        })
    })

    describe('window control buttons', () => {
        it('should call minimizeWindow when minimize is clicked', async () => {
            const user = userEvent.setup()
            render(<TitleBar />)

            const minimizeButton = screen.getByRole('button', { name: /minimize/i })
            await user.click(minimizeButton)

            expect(mockElectronAPI.minimizeWindow).toHaveBeenCalledTimes(1)
        })

        it('should call maximizeWindow when maximize is clicked', async () => {
            const user = userEvent.setup()
            render(<TitleBar />)

            const maximizeButton = screen.getByRole('button', { name: /maximize/i })
            await user.click(maximizeButton)

            expect(mockElectronAPI.maximizeWindow).toHaveBeenCalledTimes(1)
        })

        it('should call closeWindow when close is clicked', async () => {
            const user = userEvent.setup()
            render(<TitleBar />)

            const closeButton = screen.getByRole('button', { name: /close/i })
            await user.click(closeButton)

            expect(mockElectronAPI.closeWindow).toHaveBeenCalledTimes(1)
        })
    })

    describe('window state', () => {
        it('should show maximize icon when not maximized', () => {
            const { container } = render(<TitleBar />)

            const maximizeButton = container.querySelector('.maximize-button')
            expect(maximizeButton?.querySelector('.control-icon')).toBeInTheDocument()
        })

        it('should update button when window state changes to maximized', () => {
            let stateCallback: ((maximized: boolean) => void) | null = null

            mockElectronAPI.onWindowStateChanged = vi.fn((callback) => {
                stateCallback = callback
                return () => { }
            })

            render(<TitleBar />)

            // Simulate window becoming maximized
            act(() => {
                if (stateCallback) {
                    stateCallback(true)
                }
            })

            const restoreButton = screen.getByRole('button', { name: /restore/i })
            expect(restoreButton.querySelector('.control-icon')).toBeInTheDocument()
        })

        it('should call onWindowStateChanged on mount', () => {
            render(<TitleBar />)

            expect(mockElectronAPI.onWindowStateChanged).toHaveBeenCalledTimes(1)
            expect(mockElectronAPI.onWindowStateChanged).toHaveBeenCalledWith(expect.any(Function))
        })
    })

    describe('without electronAPI', () => {
        beforeEach(() => {
            // @ts-expect-error - testing without electronAPI
            window.electronAPI = undefined
        })

        it('should render without crashing when electronAPI is undefined', () => {
            expect(() => render(<TitleBar />)).not.toThrow()
        })

        it('should not throw when clicking buttons without electronAPI', async () => {
            const user = userEvent.setup()
            render(<TitleBar />)

            const minimizeButton = screen.getByRole('button', { name: /minimize/i })

            await expect(user.click(minimizeButton)).resolves.not.toThrow()
        })
    })

    describe('accessibility', () => {
        it('should have accessible labels on all buttons', () => {
            render(<TitleBar />)

            expect(screen.getByLabelText(/minimize/i)).toBeInTheDocument()
            expect(screen.getByLabelText(/maximize|restore/i)).toBeInTheDocument()
            expect(screen.getByLabelText(/close/i)).toBeInTheDocument()
        })

        it('should update aria-label when maximize/restore state changes', () => {
            let stateCallback: ((maximized: boolean) => void) | null = null

            mockElectronAPI.onWindowStateChanged = vi.fn((callback) => {
                stateCallback = callback
                return () => { }
            })

            render(<TitleBar />)

            // Initially should say "Maximize"
            expect(screen.getByLabelText(/maximize/i)).toBeInTheDocument()

            // After maximizing, should say "Restore"
            act(() => {
                if (stateCallback) {
                    stateCallback(true)
                }
            })

            expect(screen.getByLabelText(/restore/i)).toBeInTheDocument()
        })
    })
})
