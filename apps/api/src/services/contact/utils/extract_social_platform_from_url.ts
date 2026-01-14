import { SOCIAL_MEDIA_CONFIG } from '../../../shared'

export const extractSocialPlatformFromUrl = (url: string): string => {
  try {
    const hostname = new URL(url).hostname.toLowerCase()

    // First, check if the hostname exactly matches any domain in the config
    for (const [platform, config] of Object.entries(SOCIAL_MEDIA_CONFIG)) {
      if (hostname === config.domain) {
        return platform
      }
    }

    // If no exact match, try to extract the domain from subdomains
    const domain = hostname.split('.').slice(-2).join('.')
    for (const [platform, config] of Object.entries(SOCIAL_MEDIA_CONFIG)) {
      if (domain === config.domain) {
        return platform
      }
    }

    return 'unknown'
  } catch {
    return 'unknown'
  }
}
