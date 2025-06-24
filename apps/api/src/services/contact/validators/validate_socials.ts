import { extractSocialPlatformFromUrl } from '../utils/extract_social_platform_from_url.ts'

/**
 * Validates social media URLs and provides platform detection
 * @param urls Array of social media URLs to validate
 * @returns Array of valid social media URLs
 */
export interface SocialValidationResult {
  url: string
  isValid: boolean
  platform: string
}

export const is_valid_social_url = (url: string): boolean => {
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

export const analyze_social = (url: string): SocialValidationResult => {
  const isValid = is_valid_social_url(url)

  if (!isValid) {
    return {
      url,
      isValid: false,
      platform: 'unknown',
    }
  }

  // Platform detection will be handled by extractSocialPlatformFromUrl
  return {
    url,
    isValid: true,
    platform: extractSocialPlatformFromUrl(url),
  }
}

export const analyze_socials = (urls: string[]): SocialValidationResult[] => {
  return urls.map(analyze_social)
}
