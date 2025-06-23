import { logger } from '@ritchy/logger'
import { SOCIAL_MEDIA_CONFIG } from '@ritchy/types'
import whois from 'whois-json'
import { createTokenBucket } from '../utils/rate_limiter/rate_limiter'

// WHOIS rate limiter: 10 requests per minute
export const whoisRateLimiter = createTokenBucket(10 / 60, 10)

// WHOIS response parser types
export interface WhoisData {
  registrationDate: string | null
  registrar: string | null
  domainAge: number | null
  error?: string
}

/**
 * Checks if a domain is a social media domain
 * @param domain - Domain to check
 * @returns True if it's a social media domain
 */
const isSocialMediaDomain = (domain: string): boolean => {
  const socialMediaDomains = Object.values(SOCIAL_MEDIA_CONFIG).map(
    (config) => config.domain,
  )
  return socialMediaDomains.some(
    (socialDomain) =>
      domain === socialDomain || domain.endsWith(`.${socialDomain}`),
  )
}

/**
 * Extracts domain from URL, handling subdomains and protocols
 * @param url - The website URL
 * @returns The extracted domain
 */
export const extractDomainFromUrl = (url: string): string => {
  try {
    return url
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0]
      .split('?')[0]
      .split('#')[0]
      .split(':')[0]
      .toLowerCase()
  } catch (error) {
    logger.error({
      msg: 'Failed to extract domain from URL',
      event: 'domain_extraction_error',
      metadata: {
        url,
        error: error instanceof Error ? error.message : String(error),
      },
    })
    throw new Error(`Invalid URL format: ${url}`)
  }
}

/**
 * Parses WHOIS response using whois-json library
 * @param whoisResponse - Raw WHOIS response from whois-json
 * @returns Parsed WHOIS data
 */
const parseWhoisResponse = (whoisResponse: unknown): WhoisData => {
  const data: WhoisData = {
    registrationDate: null,
    registrar: null,
    domainAge: null,
  }

  try {
    const response = whoisResponse as Record<string, unknown>

    // Extract registration date
    const creationDate =
      response.creationDate ||
      response.created ||
      response.registered ||
      response.registrationDate

    if (creationDate && typeof creationDate === 'string') {
      // Handle DD/MM/YYYY format
      const dateStr = creationDate.includes('/')
        ? creationDate
            .split(' ')[0]
            .split('/')
            .reverse()
            .join('-') // Convert DD/MM/YYYY to YYYY-MM-DD
        : creationDate

      const date = new Date(dateStr)
      if (!Number.isNaN(date.getTime())) {
        data.registrationDate = date.toISOString().split('T')[0]
      }
    }

    // Extract registrar
    const registrar =
      response.registrar ||
      response.sponsoringRegistrar ||
      response.registrationServiceProvider ||
      response.adminName
    if (registrar && typeof registrar === 'string') {
      data.registrar = registrar.trim()
    }

    // Calculate domain age
    if (data.registrationDate) {
      const registrationDate = new Date(data.registrationDate)
      const now = new Date()
      data.domainAge = Math.floor(
        (now.getTime() - registrationDate.getTime()) /
          (1000 * 60 * 60 * 24 * 365.25),
      )
    }

    return data
  } catch (error) {
    logger.error({
      msg: 'Failed to parse WHOIS response',
      event: 'whois_parse_error',
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
    })
    return { ...data, error: 'Failed to parse WHOIS response' }
  }
}

/**
 * Performs WHOIS lookup with retry logic and exponential backoff
 * @param domain - Domain to lookup
 * @param maxRetries - Maximum number of retries
 * @param timeoutMs - Timeout in milliseconds (default: 5000ms)
 * @returns WHOIS data or null if lookup fails
 */
export const performWhoisLookup = async (
  domain: string,
  maxRetries = 3,
  timeoutMs = 5000,
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

  await whoisRateLimiter.getToken()

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const whoisResponse = await Promise.race([
        whois(domain),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error('WHOIS lookup timeout')),
            timeoutMs,
          ),
        ),
      ])

      const whoisData = parseWhoisResponse(whoisResponse)
      if (whoisData.error) throw new Error(whoisData.error)

      logger.info({
        event: 'whois_lookup_success',
        msg: 'WHOIS lookup completed successfully',
        metadata: {
          domain,
          registrationDate: whoisData.registrationDate,
          registrar: whoisData.registrar,
          domainAge: whoisData.domainAge,
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
      await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 1000))
    }
  }

  return null
}
