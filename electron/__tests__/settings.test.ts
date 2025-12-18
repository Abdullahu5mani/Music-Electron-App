/**
 * Settings Tests
 * Tests for configuration persistence
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as settings from '../settings'
import fs from 'fs'

// Mock dependencies
vi.mock('fs', () => ({
    default: {
        existsSync: vi.fn(),
        readFileSync: vi.fn(),
        writeFileSync: vi.fn(),
    },
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
}))

vi.mock('electron', () => ({
    app: {
        getPath: vi.fn().mockReturnValue('/mock/userData'),
    },
}))

describe('settings', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('getStoredSettings', () => {
        it('should return default settings if file missing', () => {
            vi.mocked(fs.existsSync).mockReturnValue(false)

            const result = settings.getStoredSettings()

            expect(result.musicFolderPath).toBeNull()
            expect(result.scanSubfolders).toBe(true)
        })

        it('should return parsed settings from file', () => {
            vi.mocked(fs.existsSync).mockReturnValue(true)
            vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
                musicFolderPath: '/music',
                scanSubfolders: false
            }))

            const result = settings.getStoredSettings()

            expect(result.musicFolderPath).toBe('/music')
            expect(result.scanSubfolders).toBe(false)
        })

        it('should handle corrupted config file', () => {
            vi.mocked(fs.existsSync).mockReturnValue(true)
            vi.mocked(fs.readFileSync).mockReturnValue('{ invalid json')

            // Should catch error and return defaults
            const result = settings.getStoredSettings()

            expect(result.musicFolderPath).toBeNull()
        })
    })

    describe('saveSettings', () => {
        it('should write settings to file', () => {
            const newSettings = {
                musicFolderPath: '/new/path',
                downloadFolderPath: '/dl',
                scanSubfolders: true
            }

            settings.saveSettings(newSettings)

            expect(fs.writeFileSync).toHaveBeenCalledWith(
                expect.stringContaining('app-config.json'),
                expect.stringContaining('/new/path'),
                'utf-8'
            )
        })
    })
})
