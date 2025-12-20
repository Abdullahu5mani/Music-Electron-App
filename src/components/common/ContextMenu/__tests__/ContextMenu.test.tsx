/**
 * ContextMenu Component Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ContextMenu, type ContextMenuItem } from '../ContextMenu'

describe('ContextMenu', () => {
    const mockOnClose = vi.fn()

    const defaultItems: ContextMenuItem[] = [
        { label: 'Play', icon: '/assets/icons/play.svg', onClick: vi.fn() },
        { label: 'Add to Playlist', icon: '/assets/icons/playlist-add.svg', onClick: vi.fn() },
        { label: 'Delete', icon: '/assets/icons/trash.svg', onClick: vi.fn(), disabled: true },
        { divider: true, label: '', onClick: vi.fn() },
        { label: 'Properties', onClick: vi.fn() },
    ]

    beforeEach(() => {
        vi.clearAllMocks()
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    describe('rendering', () => {
        it('should render menu items', () => {
            render(
                <ContextMenu
                    x={100}
                    y={100}
                    items={defaultItems}
                    onClose={mockOnClose}
                />
            )

            expect(screen.getByText('Play')).toBeInTheDocument()
            expect(screen.getByText('Add to Playlist')).toBeInTheDocument()
            expect(screen.getByText('Delete')).toBeInTheDocument()
            expect(screen.getByText('Properties')).toBeInTheDocument()
        })

        it('should render icons when provided', () => {
            render(
                <ContextMenu
                    x={100}
                    y={100}
                    items={defaultItems}
                    onClose={mockOnClose}
                />
            )

            // Icons should be rendered as img elements
            const icons = document.querySelectorAll('.context-menu-icon-img')
            expect(icons.length).toBeGreaterThan(0)
        })

        it('should render dividers', () => {
            render(
                <ContextMenu
                    x={100}
                    y={100}
                    items={defaultItems}
                    onClose={mockOnClose}
                />
            )

            // Query from document since it's rendered via portal
            const dividers = document.querySelectorAll('.context-menu-divider')
            expect(dividers.length).toBe(1)
        })

        it('should position menu at specified coordinates', () => {
            render(
                <ContextMenu
                    x={150}
                    y={200}
                    items={defaultItems}
                    onClose={mockOnClose}
                />
            )

            // Query from document since it's rendered via portal
            const menu = document.querySelector('.context-menu')
            expect(menu).toHaveStyle({ left: '150px', top: '200px' })
        })

        it('should apply disabled class to disabled items', () => {
            render(
                <ContextMenu
                    x={100}
                    y={100}
                    items={defaultItems}
                    onClose={mockOnClose}
                />
            )

            // Query from document since it's rendered via portal
            const deleteButton = document.querySelector('.context-menu-item.disabled')
            expect(deleteButton).toBeInTheDocument()
            expect(deleteButton).toHaveTextContent('Delete')
        })
    })

    describe('interactions', () => {
        it('should call onClick when a menu item is clicked', async () => {
            vi.useRealTimers()
            const user = userEvent.setup()
            const onPlayClick = vi.fn()

            const items: ContextMenuItem[] = [
                { label: 'Play', onClick: onPlayClick },
            ]

            render(
                <ContextMenu
                    x={100}
                    y={100}
                    items={items}
                    onClose={mockOnClose}
                />
            )

            await user.click(screen.getByText('Play'))

            expect(onPlayClick).toHaveBeenCalledTimes(1)
        })

        it('should call onClose after clicking a menu item', async () => {
            vi.useRealTimers()
            const user = userEvent.setup()
            const onItemClick = vi.fn()

            const items: ContextMenuItem[] = [
                { label: 'Action', onClick: onItemClick },
            ]

            render(
                <ContextMenu
                    x={100}
                    y={100}
                    items={items}
                    onClose={mockOnClose}
                />
            )

            await user.click(screen.getByText('Action'))

            expect(mockOnClose).toHaveBeenCalledTimes(1)
        })

        it('should NOT call onClick for disabled items', async () => {
            vi.useRealTimers()
            const user = userEvent.setup()
            const onDisabledClick = vi.fn()

            const items: ContextMenuItem[] = [
                { label: 'Disabled', onClick: onDisabledClick, disabled: true },
            ]

            render(
                <ContextMenu
                    x={100}
                    y={100}
                    items={items}
                    onClose={mockOnClose}
                />
            )

            // Click on the disabled button
            const button = screen.getByText('Disabled').closest('button')
            if (button) {
                await user.click(button)
            }

            expect(onDisabledClick).not.toHaveBeenCalled()
        })
    })

    describe('closing behavior', () => {
        it('should close on Escape key press', async () => {
            render(
                <ContextMenu
                    x={100}
                    y={100}
                    items={defaultItems}
                    onClose={mockOnClose}
                />
            )

            // Wait for event listeners to be added
            act(() => {
                vi.advanceTimersByTime(10)
            })

            fireEvent.keyDown(document, { key: 'Escape' })

            expect(mockOnClose).toHaveBeenCalledTimes(1)
        })

        it('should close when clicking outside the menu', async () => {
            render(
                <ContextMenu
                    x={100}
                    y={100}
                    items={defaultItems}
                    onClose={mockOnClose}
                />
            )

            // Wait for event listeners to be added
            act(() => {
                vi.advanceTimersByTime(10)
            })

            fireEvent.mouseDown(document.body)

            expect(mockOnClose).toHaveBeenCalledTimes(1)
        })

        it('should NOT close when clicking inside the menu', async () => {
            render(
                <ContextMenu
                    x={100}
                    y={100}
                    items={[{ label: 'Static', onClick: () => { } }]}
                    onClose={mockOnClose}
                />
            )

            // Wait for event listeners to be added
            act(() => {
                vi.advanceTimersByTime(10)
            })

            // Query from document since it's rendered via portal
            const menu = document.querySelector('.context-menu')
            if (menu) {
                fireEvent.mouseDown(menu)
            }

            // onClose should not be called for clicks inside
            expect(mockOnClose).not.toHaveBeenCalled()
        })
    })

    describe('positioning', () => {
        it('should render using a portal at document.body', () => {
            render(
                <ContextMenu
                    x={100}
                    y={100}
                    items={defaultItems}
                    onClose={mockOnClose}
                />
            )

            // The menu should be in document.body due to portal
            const menu = document.querySelector('.context-menu')
            expect(menu).toBeInTheDocument()
            expect(menu?.parentElement).toBe(document.body)
        })
    })

    describe('empty items', () => {
        it('should handle empty items array', () => {
            const { container } = render(
                <ContextMenu
                    x={100}
                    y={100}
                    items={[]}
                    onClose={mockOnClose}
                />
            )

            const menu = container.querySelector('.context-menu')
            expect(menu).not.toBeInTheDocument() // Portal renders to body

            // Check body for the menu
            const menuInBody = document.querySelector('.context-menu')
            expect(menuInBody).toBeInTheDocument()
            expect(menuInBody?.children.length).toBe(0)
        })
    })
})
