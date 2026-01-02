import { logger } from '@ritchy/logger'

import type { DomainRegistration } from '@ritchy/types'
import { WHOIS_CONFIG } from '../../config/whois'
import {
  createSimpleDurationTimer,
  externalApiDurationHistogram,
  externalApiRequestsCounter,
} from '../../metrics/collectors'
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
  const metricsTimer = createSimpleDurationTimer(externalApiDurationHistogram)
  let httpStatusCode = '500'

  try {
    logger.debug({
      msg: 'Starting WHOIS API lookup',
      event: 'whois_api_lookup_start',
      metadata: { domain },
    })

    const whoisUrl = `${WHOIS_CONFIG.BASE_URL}/${encodeURIComponent(domain)}`

    const fetchPromise = fetch(whoisUrl, {
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

    const whoisResponse = await Promise.race([fetchPromise, timeoutPromise])
    httpStatusCode = whoisResponse.status.toString()

    if (!whoisResponse.ok) {
      if (whoisResponse.status === 429) {
        metricsTimer.stop({ service: 'whois', endpoint: 'api' })
        externalApiRequestsCounter.inc({
          service: 'whois',
          endpoint: 'api',
          status_code: httpStatusCode,
        })
        throw new Error('WHOIS API rate limit exceeded')
      }

      if (whoisResponse.status === 404) {
        metricsTimer.stop({ service: 'whois', endpoint: 'api' })
        externalApiRequestsCounter.inc({
          service: 'whois',
          endpoint: 'api',
          status_code: httpStatusCode,
        })
        throw new Error('Domain not found')
      }

      // Handle 400 errors for invalid domain data
      if (whoisResponse.status === 400) {
        const errorText = await whoisResponse.text()
        try {
          const errorData = JSON.parse(errorText)
          if (errorData.code === 'DOMAIN_INVALID_INFO') {
            logger.warn({
              msg: 'WHOIS API returned invalid domain info',
              event: 'whois_api_invalid_domain',
              metadata: { domain, error: errorData.message },
            })
            metricsTimer.stop({ service: 'whois', endpoint: 'api' })
            externalApiRequestsCounter.inc({
              service: 'whois',
              endpoint: 'api',
              status_code: httpStatusCode,
            })
            return null // Return null instead of throwing
          }
        } catch {
          // If we can't parse the error, fall through to normal error handling
        }
      }

      const errorText = await whoisResponse.text()
      metricsTimer.stop({ service: 'whois', endpoint: 'api' })
      externalApiRequestsCounter.inc({
        service: 'whois',
        endpoint: 'api',
        status_code: httpStatusCode,
      })
      throw new Error(`WHOIS API error: ${whoisResponse.status} - ${errorText}`)
    }

    const rawWhoisResponse = await whoisResponse.json()

    // Check if response is an error
    if (isWhoisApiError(rawWhoisResponse)) {
      metricsTimer.stop({ service: 'whois', endpoint: 'api' })
      externalApiRequestsCounter.inc({
        service: 'whois',
        endpoint: 'api',
        status_code: httpStatusCode,
      })
      throw new Error(
        `WHOIS API error: ${rawWhoisResponse.error} - ${rawWhoisResponse.message || 'Unknown error'}`,
      )
    }

    // Validate and parse the response
    const response = validateWhoisApiResponse(rawWhoisResponse)

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
      },
    })

    // Track successful request
    metricsTimer.stop({ service: 'whois', endpoint: 'api' })
    externalApiRequestsCounter.inc({
      service: 'whois',
      endpoint: 'api',
      status_code: httpStatusCode,
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
      },
    })

    // Track other errors if not already tracked
    if (httpStatusCode === '500') {
      metricsTimer.stop({ service: 'whois', endpoint: 'api' })
      externalApiRequestsCounter.inc({
        service: 'whois',
        endpoint: 'api',
        status_code: httpStatusCode,
      })
    }

    // Return null for domain not found, but log other errors
    if (errorMessage.includes('Domain not found')) {
      return null
    }

    throw error
  }
}
