/**
 * Binary Manager Tests
 * Tests for binary status checking and version management
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as binaryManager from '../binaryManager'
import fs from 'fs'
import { execFile } from 'child_process'
import https from 'https'
import EventEmitter from 'events'

// Mock dependencies
vi.mock('fs', () => ({
    default: {
        existsSync: vi.fn(),
        unlinkSync: vi.fn(),
    },
    existsSync: vi.fn(),
    unlinkSync: vi.fn(),
}))

vi.mock('electron', () => ({
    app: {
        getPath: vi.fn().mockReturnValue('/mock/userData'),
    }
}))

vi.mock('child_process', () => ({
    default: {
        execFile: vi.fn(),
    },
    execFile: vi.fn(),
}))

vi.mock('https', () => ({
    default: {
        get: vi.fn(),
    },
    get: vi.fn(),
}))

vi.mock('../fpcalcManager', () => ({
    getFpcalcPath: vi.fn().mockReturnValue('/mock/fpcalc'),
    isFpcalcInstalled: vi.fn(),
}))
import { isFpcalcInstalled } from '../fpcalcManager'

vi.mock('../whisperManager', () => ({
    getWhisperPath: vi.fn().mockReturnValue('/mock/whisper'),
    getWhisperModelPath: vi.fn().mockReturnValue('/mock/model.bin'),
    isWhisperInstalled: vi.fn(),
    getWhisperVersion: vi.fn(),
}))
import { isWhisperInstalled, getWhisperVersion } from '../whisperManager'

describe.skip('binaryManager', () => {
    let mockReq: EventEmitter

    beforeEach(() => {
        vi.clearAllMocks()

        // Default execFile mock
        vi.mocked(execFile).mockImplementation((...args) => {
            const cb = args[args.length - 1]
            if (typeof cb === 'function') {
                const err: any = new Error('ENOENT')
                err.code = 'ENOENT'
                    ; (cb as any)(err, { stdout: '', stderr: '' })
            }
            return {} as any
        })

        // Default https mock - emit async to be safe
        mockReq = new EventEmitter()
        vi.mocked(https.get).mockImplementation((_url, _opts, cb) => {
            if (cb) {
                const res = new EventEmitter()
                // @ts-ignore
                res.statusCode = 200
                cb(res as any)
                process.nextTick(() => {
                    res.emit('data', JSON.stringify({ tag_name: '1.0.0' }))
                    res.emit('end')
                })
            }
            return mockReq as any
        })
    })

    describe('getAllBinaryStatuses', () => {
        it('should return statuses for all binaries', async () => {
            vi.mocked(fs.existsSync).mockReturnValue(true)

            vi.mocked(execFile).mockImplementation((...args) => {
                const cb = args[args.length - 1]
                if (typeof cb === 'function') {
                    // Pass object as 2nd arg which promisify returns as stdout
                    ; (cb as any)(null, { stdout: '2023.01.01', stderr: '' })
                }
                return {} as any
            })

            vi.mocked(isFpcalcInstalled).mockResolvedValue(true)
            vi.mocked(isWhisperInstalled).mockResolvedValue(true)
            vi.mocked(getWhisperVersion).mockResolvedValue('1.8.2')

            const statuses = await binaryManager.getAllBinaryStatuses()

            expect(statuses).toHaveLength(3)
            const ytdlp = statuses.find(s => s.name === 'yt-dlp')
            expect(ytdlp?.installed).toBe(true)
            expect(ytdlp?.version).toBe('2023.01.01')
        })
    })

    describe('getYtDlpStatus', () => {
        it('should detect if binary is missing', async () => {
            vi.mocked(fs.existsSync).mockReturnValue(false)

            const status = await binaryManager.getYtDlpStatus()

            expect(status.installed).toBe(false)
            expect(status.version).toBeNull()
        })

        it('should handle corrupted binary', async () => {
            vi.mocked(fs.existsSync).mockReturnValue(true)

            vi.mocked(execFile).mockImplementation((...args) => {
                const cb = args[args.length - 1]
                if (typeof cb === 'function') {
                    const err: any = new Error('EACCES')
                    err.code = 'EACCES'
                        ; (cb as any)(err, { stdout: '', stderr: '' })

                }
                return {} as any
            })

            const status = await binaryManager.getYtDlpStatus()

            expect(status.installed).toBe(false)
            expect(fs.unlinkSync).toHaveBeenCalled()
        })
    })
})
