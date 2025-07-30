export type NormalizedInstagram = {
  username: string
  url: string
}

export function normalizeInstagram(url: string): NormalizedInstagram | null {
  // Return null if URL is not provided or doesn't contain instagram.com
  if (!url?.toLowerCase()?.includes('instagram.com')) {
    return null
  }

  // Normalize the URL to lowercase for consistent checks
  const lowercaseUrl = url.toLowerCase()

  // Return null for:
  // - Main instagram.com domain
  // - Post URLs (/p/)
  // - Reel URLs (/reel/)
  if (
    lowercaseUrl === 'https://instagram.com' ||
    lowercaseUrl === 'https://www.instagram.com' ||
    lowercaseUrl.includes('instagram.com/p/') ||
    lowercaseUrl.includes('instagram.com/reel/')
  ) {
    return null
  }

  // Extract username using regex, excluding special paths
  const match = url.match(/instagram\.com\/(_u\/)?([^/?#&]+)/i) // Added 'i' flag for case-insensitive matching
  if (!match || !match[2]) {
    return null
  }

  const username = match[2]

  // Additional validation to ensure username looks legitimate
  if (
    username === '' ||
    username.toLowerCase() === 'p' ||
    username.toLowerCase() === 'reel'
  ) {
    return null
  }

  return {
    username,
    url: `https://www.instagram.com/${username}`,
  }
}
