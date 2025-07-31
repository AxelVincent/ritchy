import { logger } from '@ritchy/logger'
import type { DomainRegistration } from '@ritchy/types'
import { isSocialMediaUrl } from '../../services/enrichment/utils/is_social_media_url'
import { performWhoisLookup as performWhoisApiLookup } from './whois_api'

/**
 * Performs WHOIS lookup using external API
 * @param domain - Domain to lookup
 * @param timeoutMs - Timeout in milliseconds (default: 10000ms)
 * @returns WHOIS data or null if lookup fails
 */
export const performWhoisLookup = async (
  domain: string,
  timeoutMs = 10000,
): Promise<DomainRegistration | null> => {
  // Skip social media domains
  if (isSocialMediaUrl(domain)) {
    logger.debug({
      msg: 'Skipping WHOIS lookup for social media url',
      event: 'whois_lookup_skipped_social_media',
      metadata: { domain },
    })
    return null
  }

  try {
    const whoisData = await performWhoisApiLookup(domain, timeoutMs)

    logger.debug({
      event: 'whois_lookup_success',
      msg: 'WHOIS lookup completed successfully',
      metadata: {
        domain,
        registrationDate: whoisData?.registrationDate,
      },
    })

    return whoisData
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    logger.error({
      event: 'whois_lookup_failed',
      msg: 'WHOIS lookup failed',
      metadata: { domain, error: errorMessage },
    })

    return null
  }
}
