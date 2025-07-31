export const cleanUrl = (urlString: string): string => {
  // Handle root path
  if (urlString === '/') {
    return urlString
  }

  try {
    const urlObj = new URL(urlString)
    urlObj.hash = ''

    // Special handling for root path
    if (urlObj.pathname === '' || urlObj.pathname === '/') {
      return urlObj.toString() // This will include the trailing slash for root
    }

    // Remove trailing slash for non-root paths
    let path = urlObj.pathname
    path = path.endsWith('/') ? path.slice(0, -1) : path
    urlObj.pathname = path

    return urlObj.toString()
  } catch {
    // For relative paths that start with '/', preserve them as-is
    if (urlString.startsWith('/')) {
      return urlString.endsWith('/') && urlString !== '/'
        ? urlString.slice(0, -1)
        : urlString
    }
    return urlString
  }
}
