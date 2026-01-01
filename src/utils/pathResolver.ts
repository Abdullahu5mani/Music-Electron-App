/**
 * Converts file system paths to file:// URLs in an OS-agnostic way
 * Properly encodes special characters that have meaning in URLs
 * @param filePath - The file system path to convert
 * @returns A file:// URL that can be used by web APIs like Howler.js
 */
export function pathToFileURL(filePath: string): string {
  // Normalize path separators - convert backslashes to forward slashes
  // This handles Windows paths (C:\Users\...) and makes them consistent
  let normalizedPath = filePath.replace(/\\/g, '/')

  // Remove duplicate slashes that might occur
  normalizedPath = normalizedPath.replace(/\/+/g, '/')

  // Split path into components to encode each part properly
  // We need to encode special URL characters like #, ?, %, etc.
  // but NOT the path separators (/)
  const pathParts = normalizedPath.split('/')
  const encodedParts = pathParts.map((part, index) => {
    // Don't encode the drive letter part (e.g., "C:")
    if (index === 0 && /^[A-Za-z]:$/.test(part)) {
      return part
    }
    // Encode special characters: # ? % and others
    // encodeURIComponent encodes everything except: A-Z a-z 0-9 - _ . ! ~ * ' ( )
    // We need to encode #, ?, %, space, and other special chars
    return encodeURIComponent(part)
  })

  const encodedPath = encodedParts.join('/')

  // Handle Windows absolute paths (C:/Users/...)
  // On Windows, absolute paths start with a drive letter
  if (/^[A-Za-z]:/.test(encodedPath)) {
    // Windows path: C:/Users/... → file:///C:/Users/...
    return `file:///${encodedPath}`
  }

  // Handle Unix/macOS absolute paths (/Users/...)
  if (encodedPath.startsWith('/')) {
    // Unix/macOS path: /Users/... → file:///Users/...
    return `file://${encodedPath}`
  }

  // Handle relative paths (shouldn't happen in our use case, but handle gracefully)
  // Convert relative path to absolute-like format
  return `file:///${encodedPath}`
}
































