import { SocialMediaPlatformEnum } from '@ritchy/types'

export const isSocialMediaDomain = (domain: string): boolean => {
  const socialMediaDomains = Object.values(SocialMediaPlatformEnum.Enum).map(
    (config) => config.toLowerCase(),
  )
  return socialMediaDomains.some(
    (socialDomain) =>
      domain.toLowerCase() === socialDomain ||
      domain.toLowerCase().endsWith(`.${socialDomain}`),
  )
}
