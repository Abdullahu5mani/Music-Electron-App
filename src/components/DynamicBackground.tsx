import { useEffect, useState } from 'react'
import { Vibrant } from 'node-vibrant/browser'

interface DynamicBackgroundProps {
  albumArt?: string
}

export function DynamicBackground({ albumArt }: DynamicBackgroundProps) {
  const [gradient, setGradient] = useState<string>(
    'linear-gradient(to bottom right, #1a1a1a, #000000)'
  )

  useEffect(() => {
    if (!albumArt) {
      setGradient('linear-gradient(to bottom right, #1a1a1a, #000000)')
      return
    }

    const extractColors = async () => {
      try {
        const palette = await Vibrant.from(albumArt).getPalette()
        const primary = palette.Vibrant?.hex || '#1a1a1a'
        const secondary = palette.DarkVibrant?.hex || '#000000'

        setGradient(
          `linear-gradient(to bottom right, ${primary}80, ${secondary}80)`
        )
      } catch (error) {
        console.error('Error extracting colors:', error)
        setGradient('linear-gradient(to bottom right, #1a1a1a, #000000)')
      }
    }

    extractColors()
  }, [albumArt])

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        background: '#121212',
        transition: 'background 1s ease',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: gradient,
          transition: 'background 1s ease',
          filter: 'blur(60px)',
          opacity: 0.6,
        }}
      />
    </div>
  )
}
