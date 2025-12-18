import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import './ContextMenu.css'

export interface ContextMenuItem {
    label: string
    icon?: string
    onClick: () => void
    disabled?: boolean
    divider?: boolean
}

interface ContextMenuProps {
    x: number
    y: number
    items: ContextMenuItem[]
    onClose: () => void
}

/**
 * Custom styled context menu component
 * Appears at the specified x, y position and closes when clicking outside
 * Uses a Portal to render at document.body to avoid z-index/overflow clipping issues
 */
export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null)

    // Handle click outside to close
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose()
            }
        }

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose()
            }
        }

        // Delay adding listeners to prevent immediate close
        setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside)
            document.addEventListener('keydown', handleEscape)
        }, 0)

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            document.removeEventListener('keydown', handleEscape)
        }
    }, [onClose])

    // Adjust position if menu would go off screen
    useEffect(() => {
        if (menuRef.current) {
            const menu = menuRef.current
            const rect = menu.getBoundingClientRect()

            // Adjust horizontal position
            if (rect.right > window.innerWidth) {
                menu.style.left = `${window.innerWidth - rect.width - 10}px`
            }

            // Adjust vertical position
            if (rect.bottom > window.innerHeight) {
                menu.style.top = `${window.innerHeight - rect.height - 10}px`
            }
        }
    }, [x, y])

    // Render using Portal to ensure it's above all other elements
    return createPortal(
        <div
            ref={menuRef}
            className="context-menu"
            style={{ left: x, top: y }}
        >
            {items.map((item, index) => (
                item.divider ? (
                    <div key={index} className="context-menu-divider" />
                ) : (
                    <button
                        key={index}
                        className={`context-menu-item ${item.disabled ? 'disabled' : ''}`}
                        onClick={() => {
                            if (!item.disabled) {
                                item.onClick()
                                onClose()
                            }
                        }}
                        disabled={item.disabled}
                    >
                        {item.icon && <span className="context-menu-icon">{item.icon}</span>}
                        <span className="context-menu-label">{item.label}</span>
                    </button>
                )
            ))}
        </div>,
        document.body
    )
}
