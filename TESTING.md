# Testing Guide

This document describes the testing infrastructure and how to run tests for the Music Sync App.

## Test Framework

We use **Vitest** as our testing framework, which integrates seamlessly with Vite and provides:
- Fast test execution
- TypeScript support out of the box
- Jest-compatible API
- Built-in code coverage
- UI mode for interactive testing

## Test Structure

```
Music-Electron-App/
├── src/
│   ├── test/
│   │   └── setup.ts              # Test setup and global mocks
│   ├── utils/
│   │   ├── sortMusicFiles.test.ts
│   │   ├── rateLimiter.test.ts
│   │   └── musicbrainzClient.test.ts
│   ├── hooks/
│   │   └── useMusicLibrary.test.tsx
│   └── pathResolver.test.ts
├── electron/
│   ├── metadataCache.test.ts
│   └── ipc/
│       └── modules/
│           └── musicHandlers.test.ts
└── vite.config.ts                # Vitest configuration
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode (auto-rerun on changes)
```bash
npm test
# Press 'a' to run all tests, or tests will auto-run on file changes
```

### Run tests once (CI mode)
```bash
npm run test:run
```

### Run tests with UI (interactive)
```bash
npm run test:ui
```

### Run tests with coverage report
```bash
npm run test:coverage
```

Coverage reports will be generated in the `coverage/` directory.

## Test Categories

### Unit Tests

**Utility Functions** (`src/utils/`)
- `sortMusicFiles.test.ts` - Tests sorting logic for different sort options
- `rateLimiter.test.ts` - Tests API rate limiting delays
- `musicbrainzClient.test.ts` - Tests MusicBrainz API client functions
- `pathResolver.test.ts` - Tests file path to URL conversion

**Main Process Functions** (`electron/`)
- `metadataCache.test.ts` - Tests SQLite cache operations with in-memory database

### Integration Tests

**IPC Handlers** (`electron/ipc/modules/`)
- `musicHandlers.test.ts` - Tests IPC handler integration with main process functions

### React Hook Tests

**Custom Hooks** (`src/hooks/`)
- `useMusicLibrary.test.tsx` - Tests library management hook with mocked Electron API
- `useAudioPlayer.test.tsx` - Tests playback controls (shuffle, repeat-one/all, history for previous) with a mocked Howler
- Search filtering for the library is covered indirectly via `useMusicLibrary` tests; search bar filtering (title/artist/album) is exercised through the hook’s filtered state.

## Writing Tests

### Test File Naming

Test files should follow the pattern: `*.test.ts` or `*.test.tsx` for React components.

### Example Test Structure

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { myFunction } from './myModule'

describe('myFunction', () => {
  beforeEach(() => {
    // Setup before each test
    vi.clearAllMocks()
  })

  it('should do something', () => {
    const result = myFunction('input')
    expect(result).toBe('expected')
  })

  it('should handle errors', () => {
    expect(() => myFunction(null)).toThrow()
  })
})
```

### Mocking Electron API

The test setup file (`src/test/setup.ts`) provides a global mock for `window.electronAPI`. You can override specific methods in your tests:

```typescript
beforeEach(() => {
  global.window.electronAPI.scanMusicFolder = vi.fn().mockResolvedValue([])
})
```

### Mocking File System

For tests that interact with the file system, use Vitest's mocking capabilities:
### Mocking Howler (audio)

`useAudioPlayer.test.tsx` mocks `howler` to avoid real audio:
```ts
vi.mock('howler', () => ({
  Howl: class {
    private _playing = false
    private _seek = 0
    play() { this._playing = true; return 1 }
    pause() { this._playing = false }
    stop() { this._playing = false }
    unload() {}
    playing() { return this._playing }
    duration() { return 180 }
    seek(v?: number) { if (typeof v === 'number') this._seek = v; return this._seek }
    volume() {}
  }
}))
```


```typescript
import { vi } from 'vitest'
import * as fs from 'fs'

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}))
```

## Test Coverage Goals

We aim for:
- **80%+ coverage** for utility functions
- **70%+ coverage** for main process functions
- **60%+ coverage** for React hooks and components

## Continuous Integration

Tests should be run in CI/CD pipelines before merging code. The `test:run` script is designed for non-interactive environments.

## Debugging Tests

### Using VS Code

1. Install the "Vitest" extension
2. Set breakpoints in your test files
3. Use the "Debug Test" option from the test explorer

### Using Chrome DevTools

1. Run tests with `npm run test:ui`
2. Open the Vitest UI in your browser
3. Use browser DevTools to debug

## Common Issues

### Tests failing due to Electron mocks

If tests fail because Electron APIs aren't properly mocked, check `src/test/setup.ts` and ensure all required APIs are included in the mock.

### Database tests failing

Database tests use a temporary directory. If tests fail, ensure:
1. The test has proper cleanup in `afterEach`
2. No other process is locking the test database file

### React Hook tests failing

For React hook tests, ensure you're using `@testing-library/react`'s `renderHook` and wrapping async operations in `act()`.

## Future Improvements

- [ ] Add E2E tests with Playwright or Spectron
- [ ] Add visual regression tests
- [ ] Increase coverage for IPC handlers
- [ ] Add performance benchmarks
- [ ] Add tests for WASM fingerprinting (currently difficult due to WASM limitations)

