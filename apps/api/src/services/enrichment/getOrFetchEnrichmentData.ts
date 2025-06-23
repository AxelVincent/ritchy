import { logger } from '@ritchy/logger'
import type { DomainRegistration, EnrichResponse } from '@ritchy/types'
import { REDIS_KEYS } from '../../external/redis/keys'
import { redisClient } from '../../external/redis/redis'
import {
  extractDomainFromUrl,
  performWhoisLookup,
} from '../../external/whois/whoisLookup'
import { scrapeFromOptimizedUrls } from '../scraperEmailsAndSocials'

/**
 * Gets enrichment data from cache or fetches it if not available.
 * WHOIS/domainRegistration is always part of the enrichment object.
 */
export const getOrFetchEnrichmentData = async (
  placeId: string,
  website: string,
  maxRetries = 5,
): Promise<EnrichResponse | null> => {
  const cacheKey = REDIS_KEYS.enrich(website)
  const cached = await redisClient.get<EnrichResponse>(cacheKey)
  let enrichmentData: EnrichResponse | null = cached?.data ?? null
  let cacheUpdated = false

  // If cache miss, fetch/scrape as needed
  if (!enrichmentData) {
    enrichmentData = await scrapeFromOptimizedUrls(placeId, website, maxRetries)
    if (!enrichmentData) return null
    cacheUpdated = true
  }

  try {
    const domain = extractDomainFromUrl(website)
    const whois = await performWhoisLookup(domain)
    enrichmentData.domainRegistration = whois ?? undefined
    cacheUpdated = true

    logger.info({
      msg: 'WHOIS data updated successfully',
      event: 'whois_data_updated',
      metadata: {
        placeId,
        domain,
        registrationDate: whois?.registrationDate,
        registrar: whois?.registrar,
        domainAge: whois?.domainAge,
      },
    })
  } catch (error) {
    enrichmentData.domainRegistration = undefined
    cacheUpdated = true
    logger.warn({
      msg: 'WHOIS lookup failed, setting domainRegistration to null',
      event: 'whois_lookup_failed',
      metadata: { placeId, website, error },
    })
  }

  // Update cache if data was fetched or WHOIS was updated
  if (cacheUpdated) {
    await redisClient.set(cacheKey, enrichmentData)
  }

  return enrichmentData
}
