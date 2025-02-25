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
  // Check Redis cache first
  const cacheKey = REDIS_KEYS.enrich(website)
  let enrichmentData = await redisClient.get<EnrichResponse>(cacheKey)

  // If data is in cache, return it
  if (enrichmentData) {
    return enrichmentData
  }

  // Log cache miss
  logger.info({
    msg: 'No cached enrichment data, scraping website and caching',
    event: 'enrichment_cache_miss',
    metadata: { placeId, website },
  })

  try {
    // Fetch the enrichment data
    enrichmentData = await scrapeFromOptimizedUrls(placeId, website, maxRetries)

    // Cache the results if successful
    if (enrichmentData) {
      await redisClient.set(cacheKey, enrichmentData)
    }

    return enrichmentData
  } catch (error) {
    logger.error({
      msg: 'Failed to fetch enrichment data',
      event: 'enrichment_fetch_error',
      metadata: { placeId, website, error },
    })
    return null
  }
}
