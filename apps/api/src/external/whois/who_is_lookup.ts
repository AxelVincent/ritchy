import { logger } from '@ritchy/logger'
import { SOCIAL_MEDIA_CONFIG } from '@ritchy/types'
import whois from 'whois-json'
import { z } from 'zod'
import { isSocialMediaDomain } from '../../services/enrichment/utils/is_social_media_domain'
import { createTokenBucket } from '../utils/rate_limiter/rate_limiter'
import { parseRegistrationDate } from './utils/parse_registration_date'
import { WhoisResponseSchema } from './validators/who_is_response_schema'

// Burst allowed (10 requests quickly, then 1 per 6 seconds)
const whoisRateLimiter = createTokenBucket(10 / 60, 10)

// WHOIS response parser types
export interface WhoisData {
  registrationDate: string | null
  registrar: string | null
  domainAge: number | null
  lastUpdated: string
  error?: string
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
    lastUpdated: new Date().toISOString(),
  }

  try {
    // Validate and parse the WHOIS response using Zod
    const validationResult = WhoisResponseSchema.safeParse(whoisResponse)

    if (!validationResult.success) {
      logger.warn({
        msg: 'WHOIS response validation failed',
        event: 'whois_validation_failed',
        metadata: {
          errors: validationResult.error.errors,
          receivedData: whoisResponse,
        },
      })
      return { ...data, error: 'Invalid WHOIS response format' }
    }

    const response = validationResult.data

    // Extract registration date
    const creationDate =
      response.creationDate ||
      response.created ||
      response.registered ||
      response.registrationDate

    if (creationDate && typeof creationDate === 'string') {
      // Use robust date parsing function
      data.registrationDate = parseRegistrationDate(creationDate)
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
