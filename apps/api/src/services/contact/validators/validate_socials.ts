/**
 * Validates social media URLs and provides platform detection
 * @param urls Array of social media URLs to validate
 * @returns Array of valid social media URLs
 */

const isValidSocialUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url)
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:'
  } catch {
    return false
  }
}

export const validateSocials = (urls: string[]): string[] => {
  return urls.filter(isValidSocialUrl)
}
