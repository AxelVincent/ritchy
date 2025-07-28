import { logger } from '@ritchy/logger'
import type { DomainRegistration } from '@ritchy/types'
import { WHOIS_CONFIG } from '../../config/whois'
import { whoisApiQueue } from '../../internal/rate_limiter/config'
import {
  isWhoisApiError,
  validateWhoisApiResponse,
} from './validators/whois_api_schema'

/**
 * Performs WHOIS lookup using the WHOIS API
 * @param domain - Domain to lookup
 * @param timeoutMs - Timeout in milliseconds (default: 10000ms)
 * @returns WHOIS data or null if lookup fails
 */
export const performWhoisLookup = async (
  domain: string,
  timeoutMs = 10000,
): Promise<DomainRegistration | null> => {
  const startTime = Date.now()

  try {
    logger.debug({
      msg: 'Starting WHOIS API lookup',
      event: 'whois_api_lookup_start',
      metadata: { domain },
    })

    const rawResponse = await whoisApiQueue.addToQueue(async () => {
      const url = `${WHOIS_CONFIG.BASE_URL}/${encodeURIComponent(domain)}`

      const fetchPromise = fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${WHOIS_CONFIG.API_KEY}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Ritchy-WHOIS-Client/1.0',
        },
      })

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('WHOIS API timeout')), timeoutMs),
      )

      const response = await Promise.race([fetchPromise, timeoutPromise])

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('WHOIS API rate limit exceeded')
        }

        if (response.status === 404) {
          throw new Error('Domain not found')
        }

        // Handle 400 errors for invalid domain data
        if (response.status === 400) {
          const errorText = await response.text()
          try {
            const errorData = JSON.parse(errorText)
            if (errorData.code === 'DOMAIN_INVALID_INFO') {
              logger.warn({
                msg: 'WHOIS API returned invalid domain info',
                event: 'whois_api_invalid_domain',
                metadata: { domain, error: errorData.message },
              })
              return null // Return null instead of throwing
            }
          } catch {
            // If we can't parse the error, fall through to normal error handling
          }
        }

        const errorText = await response.text()
        throw new Error(`WHOIS API error: ${response.status} - ${errorText}`)
      }

      return response.json()
    })

    // Check if response is an error
    if (isWhoisApiError(rawResponse)) {
      throw new Error(
        `WHOIS API error: ${rawResponse.error} - ${rawResponse.message || 'Unknown error'}`,
      )
    }

    // Validate and parse the response
    const response = validateWhoisApiResponse(rawResponse)

    logger.debug({
      msg: 'WHOIS API raw response validated',
      event: 'whois_api_response_validated',
      metadata: {
        domain,
        hasDomain: !!response.domain,
        hasRegistrar: !!response.registrar,
        registrarName: response.registrar?.name,
        createdDate: response.domain?.created_date,
      },
    })

    // Safe data extraction with validated response
    const whoisData: DomainRegistration = {
      registrationDate: response.domain.created_date_in_time || null,
      lastUpdated: new Date().toISOString(),
    }

    logger.debug({
      msg: 'WHOIS API lookup completed successfully',
      event: 'whois_api_lookup_success',
      metadata: {
        domain,
        registrationDate: whoisData.registrationDate
          ? new Date(whoisData.registrationDate).toISOString()
          : null,
        durationMs: Date.now() - startTime,
      },
    })

    return whoisData
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    logger.error({
      msg: 'WHOIS API lookup failed',
      event: 'whois_api_lookup_error',
      metadata: {
        domain,
        error: errorMessage,
        durationMs: Date.now() - startTime,
      },
    })

    // Return null for domain not found, but log other errors
    if (errorMessage.includes('Domain not found')) {
      return null
    }

    throw error
  }
}
