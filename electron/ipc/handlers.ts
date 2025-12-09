import { registerMusicHandlers } from './modules/musicHandlers'
import { registerApiHandlers } from './modules/apiHandlers'
import { registerYoutubeHandlers } from './modules/youtubeHandlers'
import { registerSystemHandlers } from './modules/systemHandlers'
import { registerCacheHandlers } from './modules/cacheHandlers'

/**
 * Registers all IPC handlers for communication between main and renderer processes
 * 
 * Handler modules:
 * - musicHandlers: Folder scanning, file reading, cover art writing
 * - apiHandlers: AcoustID, MusicBrainz, image download
 * - youtubeHandlers: YouTube download, binary status
 * - systemHandlers: Window controls, settings, platform info
 * - cacheHandlers: Metadata cache operations (SQLite)
 */
export function registerIpcHandlers() {
  registerMusicHandlers()
  registerApiHandlers()
  registerYoutubeHandlers()
  registerSystemHandlers()
  registerCacheHandlers()
}
