import { SOCIAL_MEDIA_CONFIG } from '@ritchy/types'

/**
 * Checks if a domain is a social media domain
 * @param domain - Domain to check
 * @returns True if it's a social media domain
 */
export const isSocialMediaDomain = (domain: string): boolean => {
  const socialMediaDomains = Object.values(SOCIAL_MEDIA_CONFIG).map(
    (config) => config.domain,
  )
  return socialMediaDomains.some(
    (socialDomain) =>
      domain === socialDomain || domain.endsWith(`.${socialDomain}`),
  )
}
