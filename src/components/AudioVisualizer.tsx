import { useEffect, useRef } from 'react'

interface AudioVisualizerProps {
  analyser: AnalyserNode | null
  isPlaying: boolean
}

export function AudioVisualizer({ analyser, isPlaying }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number>()

  useEffect(() => {
    if (!analyser || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const draw = () => {
      if (!isPlaying) {
         // Optionally clear or fade out
         // ctx.clearRect(0, 0, canvas.width, canvas.height)
         // return
      }

      animationFrameRef.current = requestAnimationFrame(draw)

      analyser.getByteFrequencyData(dataArray)

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const width = canvas.width
      const height = canvas.height
      const barWidth = (width / bufferLength) * 2.5
      let barHeight
      let x = 0

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * height

        // Gradient color based on frequency/height
        const hue = (i / bufferLength) * 360
        ctx.fillStyle = `hsla(${hue}, 100%, 50%, 0.8)`

        // Draw bar
        ctx.fillRect(x, height - barHeight, barWidth, barHeight)

        x += barWidth + 1
      }
    }

    draw()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [analyser, isPlaying])

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={50}
      style={{
        width: '100%',
        height: '100%',
        display: 'block'
      }}
    />
  )
}
