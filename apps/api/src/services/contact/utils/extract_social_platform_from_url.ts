import { SOCIAL_MEDIA_CONFIG, type SocialMediaPlatform } from '@ritchy/types'

export const extractSocialPlatformFromUrl = (url: string): string => {
  try {
    const hostname = new URL(url).hostname.toLowerCase()

    if (hostname in SOCIAL_MEDIA_CONFIG) {
      return hostname
    }
    // if the hostname is not in the PLATFORM_DOMAINS, we try to extract the domain from the url
    const domain = hostname.split('.').slice(-2).join('.')
    if (domain in SOCIAL_MEDIA_CONFIG) {
      return domain
    }

    return 'unknown'
  } catch {
    return 'unknown'
  }
}
