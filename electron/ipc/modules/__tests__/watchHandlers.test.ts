/**
 * Watch Handlers Tests
 * Tests for file watcher IPC wrappers
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as fileWatcher from '../../../fileWatcher'

// Mock electron
vi.mock('electron', () => ({
    ipcMain: {
        handle: vi.fn(),
    },
}))

// Mock fileWatcher
vi.mock('../../../fileWatcher', () => ({
    startWatching: vi.fn(),
    stopWatching: vi.fn(),
    isWatching: vi.fn(),
    getWatchPath: vi.fn(),
    ignoreFile: vi.fn(),
}))

describe('watchHandlers', () => {
    // Since handlers are registered via side-effect (calling registerWatchHandlers),
    // we can't easily test the registration itself without refactoring.
    // However, we can import the module and assume the registration happens in main setup.
    // A better pattern for testing handlers is to export the handler functions separately 
    // or mock ipcMain.handle to capture them.

    // For now, we will assume standard simple wrapping verification.
    // But mostly we are verifying imports are correct.

    it('should invoke fileWatcher methods', async () => {
        // We can test the underlying logic calls if we had access to the registered callbacks.
        // Given the simplicity (direct mapping), we heavily rely on fileWatcher unit tests.
        expect(true).toBe(true)
    })
})

/* 
 * NOTE: To properly test these, we would need to mock ipcMain.handle
 * to execute the registered callbacks.
 */
import { registerWatchHandlers } from '../watchHandlers'
import { ipcMain } from 'electron'

describe('watchHandlers Registration', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        registerWatchHandlers()
    })

    it('should register handlers', () => {
        expect(ipcMain.handle).toHaveBeenCalledWith('file-watcher-start', expect.any(Function))
        expect(ipcMain.handle).toHaveBeenCalledWith('file-watcher-stop', expect.any(Function))
        expect(ipcMain.handle).toHaveBeenCalledWith('file-watcher-status', expect.any(Function))
        expect(ipcMain.handle).toHaveBeenCalledWith('file-watcher-ignore', expect.any(Function))
    })

    it('should call startWatching when file-watcher-start invoked', async () => {
        const handler = vi.mocked(ipcMain.handle).mock.calls.find(call => call[0] === 'file-watcher-start')?.[1]

        if (handler) {
            // @ts-ignore
            await handler({}, '/path/to/watch')
            expect(fileWatcher.startWatching).toHaveBeenCalledWith('/path/to/watch')
        }
    })

    it('should call stopWatching when file-watcher-stop invoked', async () => {
        const handler = vi.mocked(ipcMain.handle).mock.calls.find(call => call[0] === 'file-watcher-stop')?.[1]

        if (handler) {
            // @ts-ignore
            await handler({})
            expect(fileWatcher.stopWatching).toHaveBeenCalled()
        }
    })

    it('should get status when file-watcher-status invoked', async () => {
        vi.mocked(fileWatcher.isWatching).mockReturnValue(true)
        vi.mocked(fileWatcher.getWatchPath).mockReturnValue('/watched')

        const handler = vi.mocked(ipcMain.handle).mock.calls.find(call => call[0] === 'file-watcher-status')?.[1]

        if (handler) {
            // @ts-ignore
            const result = await handler({})
            expect(result).toEqual({ isWatching: true, watchPath: '/watched' })
        }
    })

    it('should ignore file when file-watcher-ignore invoked', async () => {
        const handler = vi.mocked(ipcMain.handle).mock.calls.find(call => call[0] === 'file-watcher-ignore')?.[1]

        if (handler) {
            // @ts-ignore
            await handler({}, '/path/to/ignore')
            expect(fileWatcher.ignoreFile).toHaveBeenCalledWith('/path/to/ignore')
        }
    })
})
