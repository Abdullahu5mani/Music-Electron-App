/**
 * File Watcher Tests
 * Tests for file system listening and event debounce logic
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fileWatcher from '../fileWatcher'
import fs from 'fs'
import path from 'path'

// Mock electron
const mockWebContents = { send: vi.fn() }
const mockWindow = {
    webContents: mockWebContents,
    isDestroyed: vi.fn().mockReturnValue(false)
}

vi.mock('electron', () => ({
    BrowserWindow: {
        getAllWindows: vi.fn(() => [mockWindow]),
    },
}))

// Mock fs
vi.mock('fs', () => ({
    default: {
        existsSync: vi.fn(),
        statSync: vi.fn(),
        watch: vi.fn(),
    },
    existsSync: vi.fn(),
    statSync: vi.fn(),
    watch: vi.fn(),
}))

describe('fileWatcher', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.useFakeTimers()
    })

    afterEach(() => {
        fileWatcher.stopWatching()
        vi.useRealTimers()
    })

    describe('startWatching', () => {
        it('should fail if folder does not exist', () => {
            vi.mocked(fs.existsSync).mockReturnValue(false)

            const result = fileWatcher.startWatching('/bad/path')

            expect(result.success).toBe(false)
            expect(result.error).toContain('does not exist')
        })

        it('should fail if path is not a directory', () => {
            vi.mocked(fs.existsSync).mockReturnValue(true)
            vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => false } as any)

            const result = fileWatcher.startWatching('/file.txt')

            expect(result.success).toBe(false)
        })

        it('should start watching directory', () => {
            vi.mocked(fs.existsSync).mockReturnValue(true)
            vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as any)
            const mockWatcher = { on: vi.fn(), close: vi.fn() }
            vi.mocked(fs.watch).mockReturnValue(mockWatcher as any)

            const result = fileWatcher.startWatching('/music')

            expect(result.success).toBe(true)
            expect(fileWatcher.isWatching()).toBe(true)
            expect(fs.watch).toHaveBeenCalledWith('/music', { recursive: true }, expect.any(Function))
        })
    })

    describe('stopWatching', () => {
        it('should close watcher', () => {
            vi.mocked(fs.existsSync).mockReturnValue(true)
            vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as any)
            const mockWatcher = { on: vi.fn(), close: vi.fn() }
            vi.mocked(fs.watch).mockReturnValue(mockWatcher as any)

            fileWatcher.startWatching('/music')
            fileWatcher.stopWatching()

            expect(mockWatcher.close).toHaveBeenCalled()
            expect(fileWatcher.isWatching()).toBe(false)
        })
    })

    describe('event handling', () => {
        let watchCallback: (event: string, filename: string) => void

        beforeEach(() => {
            vi.mocked(fs.existsSync).mockReturnValue(true)
            vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as any)
            const mockWatcher = { on: vi.fn(), close: vi.fn() }
            vi.mocked(fs.watch).mockImplementation((_path: any, options?: any, callback?: any) => {
                const cb = typeof options === 'function' ? options : callback
                if (typeof cb === 'function') {
                    watchCallback = cb
                }
                return mockWatcher as any
            })
            fileWatcher.startWatching('/music')
        })

        it('should ignore non-audio files', () => {
            // Trigger event
            watchCallback('change', 'notes.txt')

            // Advance timer
            vi.advanceTimersByTime(1000)

            expect(mockWebContents.send).not.toHaveBeenCalled()
        })

        it('should debounce events', () => {
            // Send multiple events
            watchCallback('change', 'song1.mp3')
            watchCallback('rename', 'song1.mp3')
            watchCallback('change', 'song2.mp3')

            // Should not have sent yet
            expect(mockWebContents.send).not.toHaveBeenCalled()

            // Advance timer
            vi.advanceTimersByTime(600)

            expect(mockWebContents.send).toHaveBeenCalled()
            // Should be batched
        })

        it('should respect ignored files', () => {
            const filePath = path.join('/music', 'song.mp3')
            fileWatcher.ignoreFile(filePath)

            // Trigger event for ignored file
            watchCallback('change', 'song.mp3')

            vi.advanceTimersByTime(1000)
            expect(mockWebContents.send).not.toHaveBeenCalled()

            // Wait for ignore duration to expire (5000ms)
            vi.advanceTimersByTime(5000)

            // Now it should work
            watchCallback('change', 'song.mp3')
            vi.advanceTimersByTime(1000)
            expect(mockWebContents.send).toHaveBeenCalled()
        })
    })
})
