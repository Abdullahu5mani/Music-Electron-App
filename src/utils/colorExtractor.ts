/**
 * Color Extraction Utility
 * Extracts dominant colors from an image for dynamic UI theming
 */

export interface ExtractedColors {
    primary: string
    secondary: string
    accent: string
    background: string
}

/**
 * Extract dominant colors from an image
 * Uses canvas to sample pixels and find the most prominent colors
 */
export async function extractColorsFromImage(imageUrl: string): Promise<ExtractedColors> {
    return new Promise((resolve) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'

        img.onload = () => {
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')

            if (!ctx) {
                resolve(getDefaultColors())
                return
            }

            // Sample at a small size for performance
            const sampleSize = 50
            canvas.width = sampleSize
            canvas.height = sampleSize

            ctx.drawImage(img, 0, 0, sampleSize, sampleSize)

            try {
                const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize)
                const colors = analyzeColors(imageData.data)
                resolve(colors)
            } catch (error) {
                // CORS or other error
                resolve(getDefaultColors())
            }
        }

        img.onerror = () => {
            resolve(getDefaultColors())
        }

        img.src = imageUrl
    })
}

/**
 * Analyze pixel data and extract dominant colors
 */
function analyzeColors(pixels: Uint8ClampedArray): ExtractedColors {
    const colorBuckets: Map<string, { count: number; r: number; g: number; b: number }> = new Map()

    // Sample every 4th pixel for performance
    for (let i = 0; i < pixels.length; i += 16) {
        const r = pixels[i]
        const g = pixels[i + 1]
        const b = pixels[i + 2]
        const a = pixels[i + 3]

        // Skip transparent pixels
        if (a < 128) continue

        // Skip very dark or very light pixels
        const brightness = (r + g + b) / 3
        if (brightness < 20 || brightness > 235) continue

        // Quantize colors to reduce unique values
        const qr = Math.round(r / 32) * 32
        const qg = Math.round(g / 32) * 32
        const qb = Math.round(b / 32) * 32

        const key = `${qr},${qg},${qb}`
        const existing = colorBuckets.get(key)

        if (existing) {
            existing.count++
            existing.r = (existing.r + r) / 2
            existing.g = (existing.g + g) / 2
            existing.b = (existing.b + b) / 2
        } else {
            colorBuckets.set(key, { count: 1, r, g, b })
        }
    }

    // Sort by count and get top colors
    const sortedColors = Array.from(colorBuckets.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 4)

    if (sortedColors.length === 0) {
        return getDefaultColors()
    }

    // Ensure we have enough colors
    while (sortedColors.length < 4) {
        sortedColors.push(sortedColors[0])
    }

    return {
        primary: rgbToHex(sortedColors[0].r, sortedColors[0].g, sortedColors[0].b),
        secondary: rgbToHex(sortedColors[1].r, sortedColors[1].g, sortedColors[1].b),
        accent: rgbToHex(sortedColors[2].r, sortedColors[2].g, sortedColors[2].b),
        background: rgbToHex(sortedColors[3].r, sortedColors[3].g, sortedColors[3].b),
    }
}

function rgbToHex(r: number, g: number, b: number): string {
    const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0')
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function getDefaultColors(): ExtractedColors {
    return {
        primary: '#667eea',
        secondary: '#764ba2',
        accent: '#f093fb',
        background: '#1a1a2e',
    }
}
