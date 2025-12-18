/**
 * File System Watcher Module
 * 
 * Watches the music folder for changes (add, remove, modify)
 * and notifies the renderer process to update the library.
 */

import { BrowserWindow } from 'electron'
import fs from 'fs'
import path from 'path'

// Supported audio extensions (must match musicScanner.ts)
const AUDIO_EXTENSIONS = [
    '.mp3', '.flac', '.wav', '.m4a', '.aac', '.ogg', '.opus',
    '.wma', '.aiff', '.mp4', '.m4p', '.amr'
]

interface FileWatcherState {
    watcher: fs.FSWatcher | null
    watchPath: string | null
    debounceTimer: NodeJS.Timeout | null
    pendingChanges: Set<string>
    // Files to temporarily ignore (being updated by the app itself)
    ignoredFiles: Set<string>
}

const state: FileWatcherState = {
    watcher: null,
    watchPath: null,
    debounceTimer: null,
    pendingChanges: new Set(),
    ignoredFiles: new Set()
}

// Duration to ignore a file after it's been marked for ignore (ms)
const IGNORE_DURATION = 5000

// Debounce delay in ms (wait for file operations to settle)
const DEBOUNCE_DELAY = 500

/**
 * Check if a file has a supported audio extension
 */
function isAudioFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase()
    return AUDIO_EXTENSIONS.includes(ext)
}

/**
 * Get all browser windows to send events to
 */
function getWindows(): BrowserWindow[] {
    return BrowserWindow.getAllWindows()
}

/**
 * Send a file change event to all renderer processes
 */
function notifyRenderers(eventType: 'added' | 'removed' | 'changed', filePaths: string[]) {
    const windows = getWindows()
    for (const win of windows) {
        if (!win.isDestroyed()) {
            win.webContents.send('file-watcher-event', { type: eventType, files: filePaths })
        }
    }
}

/**
 * Process pending changes after debounce period
 */
function processPendingChanges() {
    if (state.pendingChanges.size === 0) return

    const changes = Array.from(state.pendingChanges)
    state.pendingChanges.clear()

    // Categorize changes by checking if files exist
    const added: string[] = []
    const removed: string[] = []
    const changed: string[] = []

    for (const filePath of changes) {
        try {
            if (fs.existsSync(filePath)) {
                // File exists - could be added or changed
                // We'll treat all as "changed" and let the frontend handle it
                changed.push(filePath)
            } else {
                // File doesn't exist - it was removed
                removed.push(filePath)
            }
        } catch {
            // Error checking file - assume removed
            removed.push(filePath)
        }
    }

    // Send events to renderer
    if (added.length > 0) {
        console.log(`[FileWatcher] Files added: ${added.length}`)
        notifyRenderers('added', added)
    }
    if (removed.length > 0) {
        console.log(`[FileWatcher] Files removed: ${removed.length}`)
        notifyRenderers('removed', removed)
    }
    if (changed.length > 0) {
        console.log(`[FileWatcher] Files changed: ${changed.length}`)
        notifyRenderers('changed', changed)
    }
}

/**
 * Temporarily ignore a file (prevents file watcher from triggering during app updates)
 */
export function ignoreFile(filePath: string): void {
    state.ignoredFiles.add(filePath)
    console.log(`[FileWatcher] Temporarily ignoring: ${path.basename(filePath)}`)

    // Auto-remove from ignore list after duration
    setTimeout(() => {
        state.ignoredFiles.delete(filePath)
    }, IGNORE_DURATION)
}

/**
 * Handle a file system event
 */
function handleFsEvent(_eventType: string, filename: string | null) {
    if (!filename || !state.watchPath) return

    const fullPath = path.join(state.watchPath, filename)

    // Only process audio files
    if (!isAudioFile(fullPath)) return

    // Skip files that are being updated by the app itself
    if (state.ignoredFiles.has(fullPath)) {
        console.log(`[FileWatcher] Skipping ignored file: ${path.basename(fullPath)}`)
        return
    }

    // Add to pending changes
    state.pendingChanges.add(fullPath)

    // Debounce: reset timer on each event
    if (state.debounceTimer) {
        clearTimeout(state.debounceTimer)
    }
    state.debounceTimer = setTimeout(processPendingChanges, DEBOUNCE_DELAY)
}

/**
 * Start watching a folder for changes
 */
export function startWatching(folderPath: string): { success: boolean; error?: string } {
    // Stop any existing watcher
    stopWatching()

    try {
        // Verify folder exists
        if (!fs.existsSync(folderPath)) {
            return { success: false, error: 'Folder does not exist' }
        }

        const stats = fs.statSync(folderPath)
        if (!stats.isDirectory()) {
            return { success: false, error: 'Path is not a directory' }
        }

        // Start watching with recursive option (Windows/macOS)
        // Note: recursive option may not work on all Linux systems
        state.watcher = fs.watch(
            folderPath,
            { recursive: true },
            (eventType, filename) => {
                handleFsEvent(eventType, filename)
            }
        )

        state.watchPath = folderPath

        // Handle watcher errors
        state.watcher.on('error', (error) => {
            console.error('[FileWatcher] Error:', error)
            // Try to restart the watcher
            setTimeout(() => {
                if (state.watchPath) {
                    console.log('[FileWatcher] Attempting to restart watcher...')
                    startWatching(state.watchPath)
                }
            }, 5000)
        })

        console.log(`[FileWatcher] Started watching: ${folderPath}`)
        return { success: true }

    } catch (error) {
        console.error('[FileWatcher] Failed to start:', error)
        return { success: false, error: String(error) }
    }
}

/**
 * Stop watching the folder
 */
export function stopWatching(): void {
    if (state.debounceTimer) {
        clearTimeout(state.debounceTimer)
        state.debounceTimer = null
    }

    if (state.watcher) {
        state.watcher.close()
        state.watcher = null
        console.log('[FileWatcher] Stopped watching')
    }

    state.watchPath = null
    state.pendingChanges.clear()
}

/**
 * Check if currently watching
 */
export function isWatching(): boolean {
    return state.watcher !== null
}

/**
 * Get the currently watched path
 */
export function getWatchPath(): string | null {
    return state.watchPath
}
