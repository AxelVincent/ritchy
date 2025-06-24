import { logger } from '@ritchy/logger'
import { isSocialMediaDomain } from '../../services/enrichment/utils/is_social_media_domain'
import {
  type WhoisData,
  performWhoisLookup as performWhoisApiLookup,
} from './whois_api'

/**
 * Performs WHOIS lookup with retry logic and exponential backoff
 * @param domain - Domain to lookup
 * @param maxRetries - Maximum number of retries
 * @param timeoutMs - Timeout in milliseconds (default: 10000ms)
 * @returns WHOIS data or null if lookup fails
 */
export const performWhoisLookup = async (
  domain: string,
  maxRetries = 3,
  timeoutMs = 10000,
): Promise<WhoisData | null> => {
  // Skip social media domains
  if (isSocialMediaDomain(domain)) {
    logger.debug({
      msg: 'Skipping WHOIS lookup for social media domain',
      event: 'whois_lookup_skipped_social_media',
      metadata: { domain },
    })
    return null
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const whoisData = await performWhoisApiLookup(domain, timeoutMs)

      logger.debug({
        event: 'whois_lookup_success',
        msg: 'WHOIS lookup completed successfully',
        metadata: {
          domain,
          registrationDate: whoisData?.registrationDate,
          registrar: whoisData?.registrar,
        },
      })

      return whoisData
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)

      if (attempt === maxRetries) {
        logger.error({
          event: 'whois_lookup_failed_after_all_retries',
          msg: 'WHOIS lookup failed after all retries',
          metadata: { domain, error: errorMessage },
        })
        return null
      }

      logger.warn({
        event: 'whois_lookup_attempt_failed',
        msg: 'WHOIS lookup attempt failed',
        metadata: { domain, attempt, error: errorMessage },
      })

      // Exponential backoff: 2^attempt seconds
      await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 1000))
    }
  }

  return null
}

// Re-export the WhoisData type for convenience
export type { WhoisData } from './whois_api'
