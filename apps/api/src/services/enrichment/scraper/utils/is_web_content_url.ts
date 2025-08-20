/**
 * File extensions that should be excluded from scraping as they are not web content
 */
const NON_WEB_CONTENT_EXTENSIONS = [
  // Documents
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'odt',
  'ods',
  'odp',
  'rtf',
  'txt',
  'csv',

  // Images
  'jpg',
  'jpeg',
  'png',
  'gif',
  'svg',
  'bmp',
  'webp',
  'ico',
  'tiff',
  'tif',
  'heic',
  'heif',
  'avif',

  // Videos
  'mp4',
  'avi',
  'mov',
  'wmv',
  'flv',
  'webm',
  'mkv',
  'm4v',
  '3gp',
  'ogv',

  // Audio
  'mp3',
  'wav',
  'flac',
  'aac',
  'ogg',
  'wma',
  'm4a',
  'opus',

  // Archives
  'zip',
  'rar',
  'tar',
  'gz',
  '7z',
  'bz2',
  'xz',
  'dmg',
  'iso',

  // Executables
  'exe',
  'msi',
  'deb',
  'rpm',
  'dmg',
  'pkg',
  'app',
  'apk',

  // Fonts
  'ttf',
  'otf',
  'woff',
  'woff2',
  'eot',

  // Scripts and Styles
  'js',
  'css',
  'map',

  // Other
  'xml',
  'json',
  'rss',
  'atom',
  'sitemap',
] as const

/**
 * Checks if a URL points to web content that can be scraped
 * Returns false for PDFs, images, videos, documents, etc.
 *
 * @param url - The URL to check
 * @returns true if the URL points to scrapeable web content, false otherwise
 */
export const isWebContentUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string') {
    return false
  }

  try {
    // Parse the URL to get the pathname
    let pathname: string

    if (url.startsWith('http://') || url.startsWith('https://')) {
      const urlObj = new URL(url)
      pathname = urlObj.pathname
    } else if (url.startsWith('/')) {
      // Relative URL
      pathname = url
    } else {
      // Assume it's a path
      pathname = url
    }

    // Remove query parameters and fragments for extension checking
    const pathWithoutQuery = pathname.split('?')[0].split('#')[0]

    // Extract file extension
    const lastDot = pathWithoutQuery.lastIndexOf('.')
    const lastSlash = pathWithoutQuery.lastIndexOf('/')

    // If there's no dot, or the dot is before the last slash, there's no extension
    if (lastDot === -1 || lastDot < lastSlash) {
      return true // No extension, likely a web page
    }

    const extension = pathWithoutQuery.substring(lastDot + 1).toLowerCase()

    // Check if extension is in the excluded list
    if (
      NON_WEB_CONTENT_EXTENSIONS.includes(
        extension as (typeof NON_WEB_CONTENT_EXTENSIONS)[number],
      )
    ) {
      return false
    }

    // Allow web content extensions
    const webExtensions = [
      'html',
      'htm',
      'php',
      'asp',
      'aspx',
      'jsp',
      'cfm',
      'py',
      'rb',
      'pl',
    ]
    if (webExtensions.includes(extension)) {
      return true
    }

    // If no extension or unknown extension, assume it's web content
    return true
  } catch (_error) {
    // If URL parsing fails, be conservative and allow it
    return true
  }
}

/**
 * Filters an array of URLs to only include web content URLs
 *
 * @param urls - Array of URLs to filter
 * @returns Array of URLs that point to web content
 */
export const filterWebContentUrls = (urls: string[]): string[] => {
  return urls.filter(isWebContentUrl)
}
