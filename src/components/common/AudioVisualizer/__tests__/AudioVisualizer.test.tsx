/**
 * AudioVisualizer Component Tests
 * 
 * Note: This component relies heavily on the Web Audio API and canvas,
 * which are difficult to fully test in a jsdom environment.
 * These tests focus on the component's rendering behavior and mode switching.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { AudioVisualizer, type VisualizerMode } from '../AudioVisualizer'

// Mock Howler - the audio library
vi.mock('howler', () => ({
    Howler: {
        ctx: null, // No audio context in tests
    },
}))

describe('AudioVisualizer', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    describe('rendering', () => {
        it('should not render anything when mode is "off"', () => {
            const { container } = render(
                <AudioVisualizer
                    mode="off"
                />
            )

            expect(container.querySelector('canvas')).not.toBeInTheDocument()
        })

        it('should render a canvas when mode is "bars"', () => {
            const { container } = render(
                <AudioVisualizer
                    mode="bars"
                />
            )

            const canvas = container.querySelector('canvas')
            expect(canvas).toBeInTheDocument()
            expect(canvas).toHaveClass('audio-visualizer')
        })

        it('should render a canvas when mode is "wave"', () => {
            const { container } = render(
                <AudioVisualizer
                    mode="wave"
                />
            )

            const canvas = container.querySelector('canvas')
            expect(canvas).toBeInTheDocument()
            expect(canvas).toHaveClass('audio-visualizer')
        })

        it('should have aria-hidden attribute for accessibility', () => {
            const { container } = render(
                <AudioVisualizer
                    mode="bars"
                />
            )

            const canvas = container.querySelector('canvas')
            expect(canvas).toHaveAttribute('aria-hidden', 'true')
        })
    })

    describe('mode switching', () => {
        it('should hide canvas when mode changes to "off"', () => {
            const { container, rerender } = render(
                <AudioVisualizer mode="bars" />
            )

            expect(container.querySelector('canvas')).toBeInTheDocument()

            rerender(<AudioVisualizer mode="off" />)

            expect(container.querySelector('canvas')).not.toBeInTheDocument()
        })

        it('should show canvas when mode changes from "off" to "bars"', () => {
            const { container, rerender } = render(
                <AudioVisualizer mode="off" />
            )

            expect(container.querySelector('canvas')).not.toBeInTheDocument()

            rerender(<AudioVisualizer mode="bars" />)

            expect(container.querySelector('canvas')).toBeInTheDocument()
        })

        it('should keep canvas when switching between "bars" and "wave"', () => {
            const { container, rerender } = render(
                <AudioVisualizer mode="bars" />
            )

            expect(container.querySelector('canvas')).toBeInTheDocument()

            rerender(<AudioVisualizer mode="wave" />)

            expect(container.querySelector('canvas')).toBeInTheDocument()
        })
    })

    describe('colors prop', () => {
        it('should accept custom colors without crashing', () => {
            expect(() => {
                render(
                    <AudioVisualizer
                        mode="bars"
                        colors={{
                            primary: '#ff0000',
                            secondary: '#00ff00',
                        }}
                    />
                )
            }).not.toThrow()
        })

        it('should use default colors when not provided', () => {
            expect(() => {
                render(
                    <AudioVisualizer
                        mode="bars"
                    />
                )
            }).not.toThrow()
        })

        it('should handle partial color specification', () => {
            expect(() => {
                render(
                    <AudioVisualizer
                        mode="bars"
                        colors={{
                            primary: '#ff0000',
                            // secondary not provided
                        }}
                    />
                )
            }).not.toThrow()
        })
    })

    describe('howl prop', () => {
        it('should render without howl prop', () => {
            const { container } = render(
                <AudioVisualizer mode="bars" />
            )

            expect(container.querySelector('canvas')).toBeInTheDocument()
        })

        it('should render with null howl prop', () => {
            const { container } = render(
                <AudioVisualizer mode="bars" howl={null} />
            )

            expect(container.querySelector('canvas')).toBeInTheDocument()
        })
    })
})

describe('VisualizerMode type', () => {
    it('should accept valid mode values', () => {
        const modes: VisualizerMode[] = ['bars', 'wave', 'off']

        modes.forEach(mode => {
            const { container } = render(
                <AudioVisualizer mode={mode} />
            )

            if (mode === 'off') {
                expect(container.querySelector('canvas')).not.toBeInTheDocument()
            } else {
                expect(container.querySelector('canvas')).toBeInTheDocument()
            }
        })
    })
})
