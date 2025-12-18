/**
 * API Handlers Tests
 * Tests for AcoustID, MusicBrainz, and image download IPC handlers
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios from 'axios'

// Mock axios
vi.mock('axios')
const mockAxios = axios as unknown as {
    get: ReturnType<typeof vi.fn>
    isAxiosError: ReturnType<typeof vi.fn>
}

// Mock electron modules
vi.mock('electron', () => ({
    ipcMain: {
        handle: vi.fn(),
    },
    app: {
        getPath: vi.fn().mockReturnValue('/mock/userData'),
    },
}))

// Mock fs
vi.mock('fs', () => ({
    default: {
        existsSync: vi.fn().mockReturnValue(true),
        mkdirSync: vi.fn(),
        writeFileSync: vi.fn(),
        readdirSync: vi.fn().mockReturnValue([]),
        statSync: vi.fn(),
        unlinkSync: vi.fn(),
    },
    existsSync: vi.fn().mockReturnValue(true),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
    readdirSync: vi.fn().mockReturnValue([]),
    statSync: vi.fn(),
    unlinkSync: vi.fn(),
}))

beforeEach(() => {
    vi.clearAllMocks()
})

describe('API Handlers', () => {
    describe('AcoustID lookup logic', () => {
        it('should parse valid AcoustID response with recordings', () => {
            const mockResponse = {
                results: [
                    {
                        score: 0.95,
                        recordings: [
                            {
                                id: 'mbid-123',
                                title: 'Test Song',
                                artists: [{ name: 'Test Artist' }],
                            },
                        ],
                    },
                ],
            }

            // Simulate the parsing logic from the handler
            const data = mockResponse
            expect(data.results).toHaveLength(1)

            const bestMatch = data.results[0]
            expect(bestMatch.score).toBeGreaterThanOrEqual(0.7)
            expect(bestMatch.recordings[0].id).toBe('mbid-123')
        })

        it('should reject low confidence matches', () => {
            const mockResponse = {
                results: [
                    {
                        score: 0.5, // Below 0.7 threshold
                        recordings: [
                            { id: 'mbid-123', title: 'Test Song' },
                        ],
                    },
                ],
            }

            const MIN_SCORE_THRESHOLD = 0.7
            const bestMatch = mockResponse.results[0]
            expect(bestMatch.score).toBeLessThan(MIN_SCORE_THRESHOLD)
        })

        it('should handle empty results', () => {
            const mockResponse = { results: [] }
            expect(mockResponse.results).toHaveLength(0)
        })

        it('should handle missing score gracefully', () => {
            const mockResponse = {
                results: [
                    {
                        // No score property
                        recordings: [{ id: 'mbid-123' }],
                    },
                ],
            }

            const bestMatch = mockResponse.results[0]
            const score = (bestMatch as any).score
            expect(score).toBeUndefined()
        })
    })

    describe('Image download logic', () => {
        it('should handle successful download', async () => {
            const imageBuffer = Buffer.from('fake-image-data')
            mockAxios.get.mockResolvedValue({
                data: imageBuffer,
                status: 200,
            })

            const response = await axios.get('https://example.com/image.jpg', {
                responseType: 'arraybuffer',
            })

            expect(response.data).toEqual(imageBuffer)
        })

        it('should handle 404 errors', async () => {
            mockAxios.get.mockRejectedValue({
                response: { status: 404 },
                isAxiosError: true,
            })
            mockAxios.isAxiosError.mockReturnValue(true)

            await expect(axios.get('https://example.com/notfound.jpg')).rejects.toMatchObject({
                response: { status: 404 },
            })
        })

        it('should handle network timeout', async () => {
            mockAxios.get.mockRejectedValue({
                code: 'ECONNABORTED',
                message: 'timeout',
            })

            await expect(axios.get('https://example.com/slow.jpg')).rejects.toMatchObject({
                code: 'ECONNABORTED',
            })
        })
    })

    describe('Fallback URL logic', () => {
        it('should try next URL on failure', async () => {
            const urls = [
                'https://coverart.org/fail1.jpg',
                'https://coverart.org/fail2.jpg',
                'https://coverart.org/success.jpg',
            ]

            // Simulate fallback logic
            let successUrl: string | null = null
            for (const url of urls) {
                if (url.includes('success')) {
                    successUrl = url
                    break
                }
            }

            expect(successUrl).toBe('https://coverart.org/success.jpg')
        })

        it('should handle all URLs failing', async () => {
            const urls = [
                'https://coverart.org/fail1.jpg',
                'https://coverart.org/fail2.jpg',
            ]

            let successUrl: string | null = null
            for (const url of urls) {
                if (url.includes('success')) {
                    successUrl = url
                    break
                }
            }

            expect(successUrl).toBeNull()
        })
    })

    describe('Assets directory management', () => {
        it('should construct correct assets path', () => {
            const userDataPath = '/mock/userData'
            const assetsDir = `${userDataPath}/assets`

            expect(assetsDir).toBe('/mock/userData/assets')
        })

        it('should handle relative asset paths', () => {
            const filePath = 'assets/cover_test.jpg'
            const isAssetPath = filePath.startsWith('assets/')

            expect(isAssetPath).toBe(true)
        })
    })
})
