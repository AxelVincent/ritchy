import { logger } from '@ritchy/logger'
import type { EnrichResponse } from '@ritchy/types'
import { REDIS_KEYS } from '../../external/redis/keys'
import { redisClient } from '../../external/redis/redis'
import { extractDomainFromUrl } from '../../external/whois/utils/extract_domain_from_url'
import { performWhoisLookup } from '../../external/whois/who_is_lookup'
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

    // Only perform WHOIS lookup when fetching new data
    try {
      const domain = extractDomainFromUrl(website)
      const whois = await performWhoisLookup(domain)
      enrichmentData.domainRegistration = whois ?? undefined

      logger.debug({
        msg: 'WHOIS data fetched successfully',
        event: 'whois_data_fetched',
        metadata: {
          placeId,
          domain,
          registrationDate: whois?.registrationDate,
        },
      })
      if (!enrichmentData) return null
    } catch (error) {
      enrichmentData.domainRegistration = undefined
      logger.warn({
        msg: 'WHOIS lookup failed, setting domainRegistration to undefined',
        event: 'whois_lookup_failed',
        metadata: { placeId, website, error },
      })
    }

    cacheUpdated = true
  }

  // Update cache if data was fetched
  if (cacheUpdated) {
    await redisClient.set(cacheKey, enrichmentData)
  }

  return enrichmentData
}
