import { logger } from '@ritchy/logger'
import type { EnrichResponse } from '@ritchy/types'
import { REDIS_KEYS } from '../../lib/redis/keys'
import { redisClient } from '../../lib/redis/redis'
import { scrapeFromOptimizedUrls } from '../scraperEmailsAndSocials'

/**
 * Gets enrichment data from cache or fetches it if not available
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
  let enrichmentData = await redisClient.get<EnrichResponse>(cacheKey)

  if (enrichmentData) {
    logger.debug({
      msg: 'Retrieved enrichment data from cache',
      event: 'enrichment_cache_hit',
      metadata: { placeId, website },
    })
    return enrichmentData
  }

  logger.info({
    msg: 'Beginning enrichment process',
    event: 'enrichment_process_start',
    metadata: { placeId, website },
  })

  try {
    enrichmentData = await scrapeFromOptimizedUrls(placeId, website, maxRetries)

    if (enrichmentData) {
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
