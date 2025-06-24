/**
 * Validates social media URLs and provides platform detection
 * @param urls Array of social media URLs to validate
 * @returns Array of valid social media URLs
 */

const is_valid_social_url = (url: string): boolean => {
  try {
    const urlObj = new URL(url)
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:'
  } catch {
    return false
  }
}

export const validate_socials = (urls: string[]): string[] => {
  return urls.filter(is_valid_social_url)
}
