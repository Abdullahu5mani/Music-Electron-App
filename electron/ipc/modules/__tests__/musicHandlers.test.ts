
import { describe, it, expect, vi } from 'vitest'
import { ipcMain } from 'electron'
import { registerMusicHandlers } from '../musicHandlers'

// Mock Electron components
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    on: vi.fn()
  },
  dialog: {
    showOpenDialog: vi.fn()
  },
  app: {
    getPath: vi.fn(),
    isPackaged: false,
    getAppPath: vi.fn().mockReturnValue('/app')
  }
}))

vi.mock('fs', () => ({
  default: {
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    existsSync: vi.fn(),
  }
}))

// Mock Worker
vi.mock('worker_threads', () => ({
  Worker: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    postMessage: vi.fn(),
    terminate: vi.fn()
  }))
}))

vi.mock('../../musicScanner', () => ({
  scanMusicFiles: vi.fn(),
  readSingleFileMetadata: vi.fn()
}))

describe('musicHandlers', () => {
  it('registers generate-fingerprint handler', () => {
    registerMusicHandlers()
    expect(ipcMain.handle).toHaveBeenCalledWith('generate-fingerprint', expect.any(Function))
  })
})
