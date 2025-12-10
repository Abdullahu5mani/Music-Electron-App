import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import path from 'path'
import fs from 'fs'
import { initializeWatcher, closeWatcher } from '../libraryWatcher'

describe('Library Watcher Integration', () => {
  const tempDir = path.join(__dirname, 'temp_music_folder')

  beforeEach(() => {
    // Create temp directory
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }
  })

  afterEach(async () => {
    // Close watcher
    await closeWatcher()

    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('should detect when a new music file is added', async () => {
    const callback = vi.fn()

    // Initialize watcher
    const watcher = initializeWatcher(tempDir, callback)

    // Wait for watcher to be ready
    await new Promise<void>((resolve) => {
        watcher.on('ready', () => resolve())
    })

    // Create a dummy music file
    const filePath = path.join(tempDir, 'test_song.mp3')
    fs.writeFileSync(filePath, 'dummy content')

    // Wait for watcher to detect change (it might take a moment)
    // chokidar has awaitWriteFinish with stabilityThreshold: 2000, so we need to wait longer than that
    await new Promise((resolve) => setTimeout(resolve, 3000))

    // Assert callback was called
    expect(callback).toHaveBeenCalledWith('add', filePath)
  }, 10000)

  it('should ignore non-music files', async () => {
    const callback = vi.fn()

    // Initialize watcher
    const watcher = initializeWatcher(tempDir, callback)

    // Wait for watcher to be ready
    await new Promise<void>((resolve) => {
        watcher.on('ready', () => resolve())
    })

    // Create a dummy text file
    const filePath = path.join(tempDir, 'test.txt')
    fs.writeFileSync(filePath, 'dummy content')

    // Wait for watcher to detect change
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Assert callback was NOT called
    expect(callback).not.toHaveBeenCalled()
  }, 10000)

    it('should detect file deletion', async () => {
        const callback = vi.fn()

        // Create a dummy music file first
        const filePath = path.join(tempDir, 'delete_song.mp3')
        fs.writeFileSync(filePath, 'dummy content')

        // Initialize watcher
        const watcher = initializeWatcher(tempDir, callback)

        // Wait for watcher to be ready
        await new Promise<void>((resolve) => {
            watcher.on('ready', () => resolve())
        })

        // Delete the file
        fs.unlinkSync(filePath)

        // Wait for watcher to detect change
        await new Promise((resolve) => setTimeout(resolve, 1000))

        // Assert callback was called with unlink
        expect(callback).toHaveBeenCalledWith('unlink', filePath)
    }, 10000)
})
