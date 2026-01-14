import { logger } from '@ritchy/logger'

import { enqueueWhoisJob } from '../../internal/bullmq/jobs/whois/queue'
import {
  createSimpleDurationTimer,
  externalApiDurationHistogram,
  externalApiRequestsCounter,
} from '../../metrics/collectors'
import { isSocialMediaUrl } from '../../services/enrichment/shared/utils/is_social_media_url'
import type { DomainRegistration } from '../../shared'

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
  const metricsTimer = createSimpleDurationTimer(externalApiDurationHistogram)
  let httpStatusCode = '200'

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
    const whoisData = await enqueueWhoisJob(domain, timeoutMs)

    logger.debug({
      event: 'whois_lookup_success',
      msg: 'WHOIS lookup completed successfully',
      metadata: {
        domain,
        registrationDate: whoisData?.registrationDate,
      },
    })

    // Track successful request
    metricsTimer.stop({ service: 'whois', endpoint: 'lookup' })
    externalApiRequestsCounter.inc({
      service: 'whois',
      endpoint: 'lookup',
      status_code: httpStatusCode,
    })

    return whoisData
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    httpStatusCode = '500'

    logger.error({
      event: 'whois_lookup_failed',
      msg: 'WHOIS lookup failed',
      metadata: { domain, error: errorMessage },
    })

    // Track failed request
    metricsTimer.stop({ service: 'whois', endpoint: 'lookup' })
    externalApiRequestsCounter.inc({
      service: 'whois',
      endpoint: 'lookup',
      status_code: httpStatusCode,
    })

    return null
  }
}
