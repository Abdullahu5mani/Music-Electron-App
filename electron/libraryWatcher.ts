import chokidar from 'chokidar'
import path from 'node:path'
import { MUSIC_EXTENSIONS } from './musicScanner'

let watcher: chokidar.FSWatcher | null = null

export type WatcherCallback = (event: 'add' | 'unlink' | 'change', filePath: string) => void

/**
 * Initializes a file watcher for the specified directory.
 * @param directoryPath - The path to the directory to watch.
 * @param callback - The callback function to execute when a file event occurs.
 * @returns The watcher instance.
 */
export function initializeWatcher(directoryPath: string, callback: WatcherCallback): chokidar.FSWatcher {
  // If a watcher already exists, close it before creating a new one
  if (watcher) {
    watcher.close().catch(err => console.error('Error closing existing watcher:', err))
  }

  watcher = chokidar.watch(directoryPath, {
    ignored: (filePath, stats) => {
        // Ignore dotfiles
        if (path.basename(filePath).startsWith('.')) return true;

        // If it's a directory, don't ignore it (so we can traverse)
        // But chokidar ignores checking stats for directories in ignored function sometimes depending on version/config,
        // so we need to be careful. However, chokidar traverses directories by default.
        // We mainly want to filter files by extension.

        if (stats?.isFile()) {
            const ext = path.extname(filePath).toLowerCase();
            return !MUSIC_EXTENSIONS.includes(ext);
        }

        return false;
    },
    persistent: true,
    ignoreInitial: true, // Don't trigger events for existing files upon startup
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 100
    }
  })

  watcher
    .on('add', (filePath) => callback('add', filePath))
    .on('unlink', (filePath) => callback('unlink', filePath))
    .on('change', (filePath) => callback('change', filePath))
    .on('error', (error) => console.error(`Watcher error: ${error}`))

  return watcher
}

/**
 * Closes the active file watcher.
 */
export async function closeWatcher(): Promise<void> {
  if (watcher) {
    await watcher.close()
    watcher = null
  }
}
