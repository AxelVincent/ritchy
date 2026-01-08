/**
 * Normalizes internal URLs by:
 * 1. Adding domain for relative paths
 * 2. Removing internationalization paths (e.g., /en/, /fr-FR/)
 * 3. Removing trailing slashes
 * 4. Removing default pages (index.html, etc.)
 * 5. Removing URL parameters
 * 6. Converting to lowercase
 *
 * @example
 * normaliseInternalUrl('https://website.com/en/about/') → 'https://website.com/about'
 * normaliseInternalUrl('https://website.com/fr-FR/about?lang=fr') → 'https://website.com/about'
 * normaliseInternalUrl('https://website.com/EN/about/index.html') → 'https://website.com/about'
 * normaliseInternalUrl('/contact', 'https://website.com') → 'https://website.com/contact'
 */
export const normaliseInternalUrl = (
  url: string,
  baseUrl?: string,
): string | null => {
  try {
    // Handle relative paths by combining with base URL if provided
    let fullUrl: URL
    try {
      fullUrl = new URL(url)
    } catch {
      // If URL parsing fails, it might be a relative path
      if (!baseUrl) return null
      fullUrl = new URL(url, baseUrl)
    }

    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(fullUrl.protocol)) {
      return null
    }

    // Convert path to lowercase for consistency
    let path = fullUrl.pathname.toLowerCase()

    // Remove internationalization paths
    // Matches patterns like /en/, /en-US/, /fr/, /fr-FR/, etc.
    path = path.replace(/^\/[a-z]{2}(-[a-z]{2})?(?=\/|$)/i, '')

    // Remove default pages
    path = path.replace(/\/(index|default)\.(html|htm|php|asp|aspx)$/i, '/')

    // Remove trailing slash except for root path
    path = path === '/' ? path : path.replace(/\/$/, '')

    // Reconstruct the URL with only the protocol, host, and normalized path
    // Intentionally exclude search params and hash
    return `${fullUrl.protocol}//${fullUrl.host}${path}`
  } catch {
    // If URL parsing fails, return null
    return null
  }
}
