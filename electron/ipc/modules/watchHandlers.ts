/**
 * File Watcher IPC Handlers
 * 
 * Registers IPC handlers for starting/stopping the file system watcher
 */

import { ipcMain } from 'electron'
import { startWatching, stopWatching, isWatching, getWatchPath, ignoreFile } from '../../fileWatcher'

export function registerWatchHandlers(): void {
    // Start watching a folder
    ipcMain.handle('file-watcher-start', async (_event, folderPath: string) => {
        return startWatching(folderPath)
    })

    // Stop watching
    ipcMain.handle('file-watcher-stop', async () => {
        stopWatching()
        return { success: true }
    })

    // Get current watcher status
    ipcMain.handle('file-watcher-status', async () => {
        return {
            isWatching: isWatching(),
            watchPath: getWatchPath()
        }
    })

    // Temporarily ignore a file (prevents triggering rescan during app-initiated updates)
    ipcMain.handle('file-watcher-ignore', async (_event, filePath: string) => {
        ignoreFile(filePath)
        return { success: true }
    })
}
