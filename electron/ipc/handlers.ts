import { registerMusicHandlers } from './modules/musicHandlers'
import { registerApiHandlers } from './modules/apiHandlers'
import { registerYoutubeHandlers } from './modules/youtubeHandlers'
import { registerSystemHandlers } from './modules/systemHandlers'
import { registerCacheHandlers } from './modules/cacheHandlers'
import { registerFingerprintHandlers } from './modules/fingerprintHandlers'
import { registerPlaylistHandlers } from './modules/playlistHandlers'
import { registerWatchHandlers } from './modules/watchHandlers'

/**
 * Registers all IPC handlers for communication between main and renderer processes
 * 
 * Handler modules:
 * - musicHandlers: Folder scanning, file reading, cover art writing
 * - apiHandlers: AcoustID, MusicBrainz, image download
 * - youtubeHandlers: YouTube download, binary status
 * - systemHandlers: Window controls, settings, platform info
 * - cacheHandlers: Metadata cache operations (SQLite)
 * - fingerprintHandlers: Audio fingerprint generation using fpcalc
 * - playlistHandlers: Playlist creation, editing, and management
 * - watchHandlers: File system watching for automatic library updates
 */
export function registerIpcHandlers() {
  registerMusicHandlers()
  registerApiHandlers()
  registerYoutubeHandlers()
  registerSystemHandlers()
  registerCacheHandlers()
  registerFingerprintHandlers()
  registerPlaylistHandlers()
  registerWatchHandlers()
}
