import type { EnrichResponse } from '@ritchy/types'
import { isValidUrl } from '../../../utils/is_valid_url'

/**
 * Sanitizes enrichment data to ensure it meets validation requirements
 *
 * @param data - Raw enrichment data to sanitize
 * @param placeId - ID of the place (for logging)
 * @returns Sanitized enrichment data
 */
export const sanitizeEnrichmentData = (
  data: EnrichResponse,
  placeId: string,
): EnrichResponse => {
  const sanitized = { ...data }

  // Sanitize social links
  if (sanitized.socialLinks) {
    for (const platform of Object.keys(sanitized.socialLinks)) {
      const links = sanitized.socialLinks[platform]
      sanitized.socialLinks[platform] = Array.isArray(links)
        ? links.filter((link) => typeof link === 'string' && isValidUrl(link))
        : typeof links === 'string' && isValidUrl(links)
          ? [links]
          : []
    }
  }

  // Sanitize emails
  sanitized.emails = Array.isArray(sanitized.emails)
    ? sanitized.emails.filter(
        (email) =>
          typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
      )
    : []

  // Sanitize domain registration
  if (sanitized.domainRegistration) {
    const { registrationDate } = sanitized.domainRegistration

    // Validate and fix registration date
    if (registrationDate && typeof registrationDate === 'string') {
      const date = new Date(registrationDate)
      sanitized.domainRegistration.registrationDate = !Number.isNaN(
        date.getTime(),
      )
        ? registrationDate
        : null
    }
  }

  // Ensure id is present
  sanitized.id = sanitized.id || placeId

  return sanitized
}
