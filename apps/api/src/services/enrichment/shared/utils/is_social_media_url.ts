import { SOCIAL_MEDIA_DOMAINS } from '../../../../shared'

export const isSocialMediaUrl = (domain: string): boolean => {
  try {
    // Handle full URLs by parsing them
    let normalizedDomain = domain.toLowerCase().trim()

    // Try to parse as URL if it starts with http(s)
    if (normalizedDomain.startsWith('http')) {
      // Basic validation for proper URL format
      if (normalizedDomain.includes('///')) {
        return false
      }

      const url = new URL(normalizedDomain)
      normalizedDomain = url.hostname
    }

    // Additional validation for empty domains
    if (!normalizedDomain) {
      return false
    }

    return SOCIAL_MEDIA_DOMAINS.some(
      (socialDomain) =>
        normalizedDomain === socialDomain ||
        normalizedDomain.endsWith(`.${socialDomain}`),
    )
  } catch {
    // If URL parsing fails, fall back to direct string comparison
    return false
  }
}
