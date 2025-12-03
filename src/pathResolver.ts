/**
 * Converts file system paths to file:// URLs in an OS-agnostic way
 * @param filePath - The file system path to convert
 * @returns A file:// URL that can be used by web APIs like Howler.js
 */
export function pathToFileURL(filePath: string): string {
  // Normalize path separators - convert backslashes to forward slashes
  // This handles Windows paths (C:\Users\...) and makes them consistent
  let normalizedPath = filePath.replace(/\\/g, '/')
  
  // Remove duplicate slashes that might occur
  normalizedPath = normalizedPath.replace(/\/+/g, '/')
  
  // Handle Windows absolute paths (C:/Users/...)
  // On Windows, absolute paths start with a drive letter
  if (/^[A-Za-z]:/.test(normalizedPath)) {
    // Windows path: C:/Users/... → file:///C:/Users/...
    return `file:///${normalizedPath}`
  }
  
  // Handle Unix/macOS absolute paths (/Users/...)
  if (normalizedPath.startsWith('/')) {
    // Unix/macOS path: /Users/... → file:///Users/...
    return `file://${normalizedPath}`
  }
  
  // Handle relative paths (shouldn't happen in our use case, but handle gracefully)
  // Convert relative path to absolute-like format
  return `file:///${normalizedPath}`
}






















