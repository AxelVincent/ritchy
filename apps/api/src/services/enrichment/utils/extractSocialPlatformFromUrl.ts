const PLATFORM_DOMAINS = {
  'linkedin.com': 'linkedin',
  'twitter.com': 'twitter',
  'facebook.com': 'facebook',
  'instagram.com': 'instagram',
  'youtube.com': 'youtube',
  'tiktok.com': 'tiktok',
  'github.com': 'github',
  'pinterest.com': 'pinterest',
} as const

export const extractSocialPlatformFromUrl = (url: string) => {
  try {
    const hostname = new URL(url).hostname.toLowerCase()

    if (hostname in PLATFORM_DOMAINS) {
      return PLATFORM_DOMAINS[hostname as keyof typeof PLATFORM_DOMAINS]
    }
    // if the hostname is not in the PLATFORM_DOMAINS, we try to extract the domain from the url
    const domain = hostname.split('.').slice(-2).join('.')
    if (domain in PLATFORM_DOMAINS) {
      return PLATFORM_DOMAINS[domain as keyof typeof PLATFORM_DOMAINS]
    }

    return 'unknown'
  } catch {
    return 'unknown'
  }
}
