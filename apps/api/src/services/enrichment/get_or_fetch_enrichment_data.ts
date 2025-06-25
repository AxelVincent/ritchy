import { logger } from '@ritchy/logger'
import type { EnrichResponse } from '@ritchy/types'
import { REDIS_KEYS } from '../../external/redis/keys'
import { redisClient } from '../../external/redis/redis'
import { extractDomainFromUrl } from '../../external/whois/utils/extract_domain_from_url'
import { performWhoisLookup } from '../../external/whois/who_is_lookup'
import { scrapeFromOptimizedUrls } from '../scraperEmailsAndSocials'

/**
 * Gets enrichment data from cache or fetches it if not available.
 * WHOIS/domainRegistration is always part of the enrichment object when fetching new data.
 * @param placeId - The Google Maps place ID
 * @param website - The website URL to scrape
 * @param maxRetries - Maximum number of retries for scraping
 * @returns The enrichment data or null if fetching fails
 */
export const getOrFetchEnrichmentData = async (
  placeId: string,
  website: string,
  maxRetries = 5,
): Promise<EnrichResponse | null> => {
  const cacheKey = REDIS_KEYS.enrich(website)
  const cachedData = await redisClient.get<EnrichResponse>(cacheKey)

  if (cachedData) {
    logger.debug({
      msg: 'Retrieved enrichment data from cache',
      event: 'enrichment_cache_hit',
      metadata: { placeId, website },
    })
    return cachedData.data
  }

  logger.info({
    msg: 'Beginning enrichment process',
    event: 'enrichment_process_start',
    metadata: { placeId, website },
  })

  try {
    const enrichmentData = await scrapeFromOptimizedUrls(
      placeId,
      website,
      maxRetries,
    )

    if (enrichmentData) {
      // Perform WHOIS lookup when fetching new data
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
      } catch (error) {
        enrichmentData.domainRegistration = undefined
        logger.warn({
          msg: 'WHOIS lookup failed, setting domainRegistration to undefined',
          event: 'whois_lookup_failed',
          metadata: { placeId, website, error },
        })
      }

      await redisClient.set(cacheKey, enrichmentData)
      logger.info({
        msg: 'Enrichment completed successfully',
        event: 'enrichment_complete',
        metadata: {
          placeId,
          website,
          stats: {
            emailsFound: enrichmentData.emails.length,
            socialPlatformsFound: Object.keys(enrichmentData.socialLinks)
              .length,
          },
        },
      })
    }

    return enrichmentData
  } catch (error) {
    logger.error({
      msg: 'Enrichment process failed',
      event: 'enrichment_process_error',
      metadata: {
        placeId,
        website,
        error: error instanceof Error ? error.message : String(error),
      },
    })
    return null
  }
}
