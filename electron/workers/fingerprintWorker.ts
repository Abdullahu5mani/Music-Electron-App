
import { parentPort } from 'worker_threads';
import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

// Determine platform-specific binary name
const platform = os.platform();
let binaryName = 'fpcalc';
if (platform === 'win32') {
  binaryName = 'fpcalc.exe';
}

// Function to find fpcalc binary
function getFpcalcPath(): string {
  // In production (bundled with electron-builder)
  // Resources are usually in resources/bin relative to app path
  // process.resourcesPath points to the resources directory in packaged app

  if (process.env.NODE_ENV === 'development') {
    // In dev, it's relative to project root
    // Worker runs from dist-electron/workers/ or similar
    // We can try to find project root or hardcode for dev
    // Assuming CWD is project root in dev (often true when launched via vite)
    const devPath = path.resolve('resources', 'bin', platform === 'win32' ? 'win' : (platform === 'darwin' ? 'mac' : 'linux'), binaryName);
    if (fs.existsSync(devPath)) return devPath;

    // Fallback: check if in PATH
    return binaryName;
  } else {
    // Production
    // resources/bin is copied to resources/bin in the app
    // process.resourcesPath is the path to the 'resources' directory.
    // We mapped "resources/bin" to "bin" in extraResources.
    // So it should be at process.resourcesPath/bin/...

    // Note: electron-builder extraResources "to" is relative to "Contents/Resources" on macOS
    // or "resources" on Linux/Windows.
    // However, we mapped "resources/bin" to "bin", so it should be "resources/bin".

    // Actually, "to": "bin" means it goes to `resources/bin`? No, "to" is relative to the app resources directory.
    // On Linux: resources/bin

    // Wait, let's verify structure.
    // If "to": "bin", then inside resources folder there will be a "bin" folder.

    const basePath = process.resourcesPath; // This is usually .../resources

    // We need to account for the platform subdirectory we created in resources/bin
    // In dev we have resources/bin/linux/fpcalc
    // In prod, we copied resources/bin to bin.
    // So we should have resources/bin/linux/fpcalc

    const prodPath = path.join(basePath, 'bin', platform === 'win32' ? 'win' : (platform === 'darwin' ? 'mac' : 'linux'), binaryName);
    if (fs.existsSync(prodPath)) return prodPath;

    return binaryName; // Fallback to PATH
  }
}

const fpcalcPath = getFpcalcPath();

if (parentPort) {
  parentPort.on('message', (message) => {
    const { filePath, id } = message;

    if (!filePath) {
      parentPort?.postMessage({ id, error: 'No file path provided' });
      return;
    }

    // Run fpcalc
    // -json flag for JSON output
    execFile(fpcalcPath, ['-json', filePath], (error, stdout, stderr) => {
      if (error) {
        parentPort?.postMessage({ id, error: error.message, stderr });
        return;
      }

      try {
        const result = JSON.parse(stdout);
        parentPort?.postMessage({ id, result });
      } catch (parseError: any) {
        parentPort?.postMessage({ id, error: 'Failed to parse fpcalc output', details: parseError.message });
      }
    });
  });
}
