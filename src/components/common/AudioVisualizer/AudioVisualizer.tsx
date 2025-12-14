import { useEffect, useRef, useState } from 'react'
import { Howler } from 'howler'
import type { Howl } from 'howler'
import './AudioVisualizer.css'

export type VisualizerMode = 'bars' | 'wave' | 'off'

interface AudioVisualizerProps {
    mode: VisualizerMode
    colors?: {
        primary?: string
        secondary?: string
    }
    howl?: Howl | null
}

// Global state to track connection
let globalAnalyser: AnalyserNode | null = null
let connectedHowlId: number | null = null

/**
 * Audio Visualizer Component
 * 
 * For HTML5 audio (which Howler uses with html5:true), we need to 
 * create a MediaElementAudioSourceNode from the internal audio element.
 */
export function AudioVisualizer({
    mode,
    colors = { primary: '#667eea', secondary: '#764ba2' },
    howl
}: AudioVisualizerProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const animationFrameRef = useRef<number | null>(null)
    const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null)
    const [isReady, setIsReady] = useState(false)

    // Connect to the Howl instance's audio element
    useEffect(() => {
        if (mode === 'off' || !howl) {
            setIsReady(false)
            return
        }

        // Track this connection attempt to prevent stale callbacks
        let retryCount = 0
        const maxRetries = 10
        let timeoutId: NodeJS.Timeout | null = null

        const connectToAudio = () => {
            // Check if we've been cancelled or exceeded retries
            if (retryCount >= maxRetries) {
                console.warn('AudioVisualizer: Max retries exceeded, giving up')
                return
            }
            retryCount++

            // Access Howler's AudioContext
            const audioCtx = Howler.ctx
            if (!audioCtx) {
                timeoutId = setTimeout(connectToAudio, 100)
                return
            }

            // Verify howl is still valid (might have been unloaded during rapid switching)
            // @ts-expect-error - accessing internal Howler property
            if (!howl._sounds || howl._state === 'unloaded') {
                // Howl was unloaded, stop trying
                return
            }

            // Get the internal audio element from Howl
            // @ts-expect-error - accessing internal Howler property
            const sounds = howl._sounds
            if (!sounds || sounds.length === 0) {
                timeoutId = setTimeout(connectToAudio, 100)
                return
            }

            const audioElement = sounds[0]._node as HTMLAudioElement
            if (!audioElement) {
                timeoutId = setTimeout(connectToAudio, 100)
                return
            }

            // Get the Howl's internal ID to track if we need to reconnect
            // @ts-expect-error - accessing internal Howler property
            const howlId = howl._id

            // Skip if already connected to this howl
            if (connectedHowlId === howlId && globalAnalyser) {
                setIsReady(true)
                return
            }

            // Create analyser if needed
            if (!globalAnalyser) {
                globalAnalyser = audioCtx.createAnalyser()
                globalAnalyser.fftSize = 256
                globalAnalyser.smoothingTimeConstant = 0.85
            }

            try {
                // Check if this audio element already has a source node
                // @ts-expect-error - custom property
                if (audioElement._sourceNode) {
                    // @ts-expect-error - custom property
                    sourceNodeRef.current = audioElement._sourceNode
                    try {
                        sourceNodeRef.current?.connect(globalAnalyser)
                    } catch (e) {
                        // Already connected, that's fine
                    }
                } else {
                    // Create MediaElementAudioSourceNode from the audio element
                    const source = audioCtx.createMediaElementSource(audioElement)
                    sourceNodeRef.current = source

                    // Store reference on the element to prevent re-creation
                    // @ts-expect-error - custom property
                    audioElement._sourceNode = source

                    // Connect: source -> analyser -> destination
                    source.connect(globalAnalyser)
                    globalAnalyser.connect(audioCtx.destination)
                }

                connectedHowlId = howlId
                setIsReady(true)
            } catch (err) {
                // If we get "already connected" error, that's okay
                if ((err as Error).message?.includes('already connected')) {
                    setIsReady(true)
                } else {
                    // Don't log every error during rapid switching
                    // console.error('AudioVisualizer connection error:', err)
                }
            }
        }

        connectToAudio()

        return () => {
            // Cleanup pending timeouts on unmount or howl change
            if (timeoutId) {
                clearTimeout(timeoutId)
            }
        }
    }, [mode, howl])

    // Helper to ensure color is visible against dark background
    const ensureVisibleColor = (color: string) => {
        // If hex, convert to visible version
        if (color.startsWith('#')) {
            // Simple approach: if it's too dark, lighten it
            // Or just return it and rely on the shadow/glow we're about to add
            return color
        }
        return color
    }

    // Animation loop
    useEffect(() => {
        if (mode === 'off' || !isReady || !globalAnalyser) return

        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const analyser = globalAnalyser
        const frequencyData = new Uint8Array(analyser.frequencyBinCount)
        const timeDomainData = new Uint8Array(analyser.fftSize)

        // Resize canvas
        const resizeCanvas = () => {
            const rect = canvas.getBoundingClientRect()
            if (rect.width > 0 && rect.height > 0) {
                canvas.width = rect.width * window.devicePixelRatio
                canvas.height = rect.height * window.devicePixelRatio
                ctx.setTransform(1, 0, 0, 1, 0, 0)
                ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
            }
        }
        resizeCanvas()

        const primary = ensureVisibleColor(colors.primary || '#667eea')
        const secondary = ensureVisibleColor(colors.secondary || '#764ba2')

        // Draw bars
        const drawBars = () => {
            analyser.getByteFrequencyData(frequencyData)

            const width = canvas.width / window.devicePixelRatio
            const height = canvas.height / window.devicePixelRatio

            ctx.clearRect(0, 0, width, height)

            // Only use the lower ~55% of frequency bins (where most music content is)
            // This removes the empty high-frequency space on the right side
            const fullBufferLength = analyser.frequencyBinCount
            const usableBins = Math.floor(fullBufferLength * 0.55)

            // Calculate bar dimensions to fit and center
            const gap = 1
            const minBarWidth = 2
            const barWidth = Math.max(minBarWidth, (width * 0.9) / usableBins) // Use 90% of width
            const actualTotalWidth = usableBins * barWidth
            const offsetX = (width - actualTotalWidth) / 2 // Center the bars

            const gradient = ctx.createLinearGradient(0, height, 0, 0)
            gradient.addColorStop(0, primary + '40') // increased opacity
            gradient.addColorStop(0.5, primary + '80') // increased opacity
            gradient.addColorStop(1, secondary + 'FF') // full opacity at top

            // Add glow effect for better visibility
            ctx.shadowBlur = 15
            ctx.shadowColor = primary

            ctx.fillStyle = gradient

            for (let i = 0; i < usableBins; i++) {
                const barHeight = (frequencyData[i] / 255) * height * 0.95
                const x = offsetX + (i * barWidth)

                // Draw outline for better contrast
                if (barHeight > 0) {
                    ctx.fillRect(x, height - barHeight, Math.max(1, barWidth - gap), barHeight)

                    // Add a subtle top highlight
                    ctx.fillStyle = '#ffffff80'
                    ctx.fillRect(x, height - barHeight, Math.max(1, barWidth - gap), 2)
                    ctx.fillStyle = gradient
                }
            }

            // Reset shadow
            ctx.shadowBlur = 0
            ctx.shadowColor = 'transparent'
        }

        // Draw wave
        const drawWave = () => {
            analyser.getByteTimeDomainData(timeDomainData)

            const width = canvas.width / window.devicePixelRatio
            const height = canvas.height / window.devicePixelRatio

            ctx.clearRect(0, 0, width, height)

            const bufferLength = analyser.fftSize
            const sliceWidth = width / bufferLength

            const gradient = ctx.createLinearGradient(0, 0, 0, height)
            gradient.addColorStop(0, primary + '90')
            gradient.addColorStop(0.5, secondary + '70')
            gradient.addColorStop(1, primary + '30')

            // Add glow effect
            ctx.shadowBlur = 10
            ctx.shadowColor = primary

            ctx.beginPath()
            ctx.moveTo(0, height)

            let x = 0
            for (let i = 0; i < bufferLength; i++) {
                const v = timeDomainData[i] / 128.0
                const y = height - ((v - 0.5) * height * 0.8) - (height * 0.1)
                if (i === 0) ctx.lineTo(x, y)
                else ctx.lineTo(x, y)
                x += sliceWidth
            }

            ctx.lineTo(width, height)
            ctx.closePath()
            ctx.fillStyle = gradient
            ctx.fill()

            // Draw clean stroke on top
            ctx.beginPath()
            x = 0
            for (let i = 0; i < bufferLength; i++) {
                const v = timeDomainData[i] / 128.0
                const y = height - ((v - 0.5) * height * 0.8) - (height * 0.1)
                if (i === 0) ctx.moveTo(x, y)
                else ctx.lineTo(x, y)
                x += sliceWidth
            }
            ctx.strokeStyle = '#ffffff80' // White overlay for visibility
            ctx.lineWidth = 2
            ctx.stroke()

            ctx.strokeStyle = primary
            ctx.lineWidth = 2
            ctx.stroke()

            // Reset shadow
            ctx.shadowBlur = 0
            ctx.shadowColor = 'transparent'
        }

        const animate = () => {
            if (mode === 'bars') drawBars()
            else if (mode === 'wave') drawWave()
            animationFrameRef.current = requestAnimationFrame(animate)
        }

        animate()
        window.addEventListener('resize', resizeCanvas)

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current)
            }
            window.removeEventListener('resize', resizeCanvas)
        }
    }, [mode, isReady, colors.primary, colors.secondary])

    if (mode === 'off') return null

    return (
        <canvas
            ref={canvasRef}
            className="audio-visualizer"
            aria-hidden="true"
        />
    )
}
