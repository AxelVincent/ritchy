/**
 * Utility function to clean URLs for display
 * Removes 'www.' prefix and shows full URL with path/search/hash
 */
export const getCleanUrlDisplay = (url: string): string => {
  try {
    const urlObj = new URL(url)
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return url
    }
    const cleanHostname = urlObj.hostname.replace('www.', '')
    return cleanHostname + urlObj.pathname + urlObj.search + urlObj.hash
  } catch {
    return url
  }
}

/**
 * Utility function to extract just the domain from URL
 * Removes 'www.' prefix and returns only the hostname
 */
export const getDomainFromUrl = (url: string): string => {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname.replace('www.', '')
  } catch {
    return url
  }
}
