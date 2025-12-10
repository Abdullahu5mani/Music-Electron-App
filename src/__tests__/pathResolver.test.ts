import { describe, it, expect } from 'vitest'
import { pathToFileURL } from '../pathResolver'

describe('pathToFileURL', () => {
  it('should convert Windows absolute path to file:// URL', () => {
    const windowsPath = 'C:\\Users\\test\\music\\song.mp3'
    const result = pathToFileURL(windowsPath)
    expect(result).toBe('file:///C:/Users/test/music/song.mp3')
  })

  it('should convert Unix absolute path to file:// URL', () => {
    const unixPath = '/Users/test/music/song.mp3'
    const result = pathToFileURL(unixPath)
    expect(result).toBe('file:///Users/test/music/song.mp3')
  })

  it('should handle paths with forward slashes on Windows', () => {
    const path = 'C:/Users/test/music/song.mp3'
    const result = pathToFileURL(path)
    expect(result).toBe('file:///C:/Users/test/music/song.mp3')
  })

  it('should remove duplicate slashes', () => {
    const path = 'C://Users//test//music//song.mp3'
    const result = pathToFileURL(path)
    expect(result).toBe('file:///C:/Users/test/music/song.mp3')
  })

  it('should handle relative paths', () => {
    const relativePath = 'music/song.mp3'
    const result = pathToFileURL(relativePath)
    expect(result).toBe('file:///music/song.mp3')
  })

  it('should handle paths with spaces', () => {
    const path = 'C:/Users/test/My Music/song name.mp3'
    const result = pathToFileURL(path)
    expect(result).toBe('file:///C:/Users/test/My Music/song name.mp3')
  })

  it('should handle macOS paths', () => {
    const macPath = '/Users/test/Music/song.mp3'
    const result = pathToFileURL(macPath)
    expect(result).toBe('file:///Users/test/Music/song.mp3')
  })

  it('should handle Linux paths', () => {
    const linuxPath = '/home/user/music/song.mp3'
    const result = pathToFileURL(linuxPath)
    expect(result).toBe('file:///home/user/music/song.mp3')
  })
})

