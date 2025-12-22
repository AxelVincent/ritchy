import type { CrawlScrapeOptions as FirecrawlOptions } from '@mendable/firecrawl-js'
import { logger } from '@ritchy/logger'
import { scrapeWithRetry } from '../../../external/firecrawl'
import { brightdataScraper } from './brightdata_scraper'

export type ScrapeResult = {
  success: boolean
  status: string
  error?: string
  metadata?: {
    statusCode?: number
    responseTimeInSeconds?: number
  }
  html?: string
  rawHtml?: string
  markdown?: string
}

type CommonOptions = {
  formats: string[]
  excludeTags: string[]
  onlyMainContent: boolean
  proxy?: string
  country?: string
}

// Traffic split configuration
const FIRECRAWL_TRAFFIC_PERCENTAGE = 0.8 // 80% of traffic to Firecrawl

/**
 * Determines which scraper to use as primary based on a 50/50 traffic split
 * Uses a deterministic hash of the URL to ensure consistent routing for the same URL
 */
const getPrimaryScraper = (url: string): 'firecrawl' | 'brightdata' => {
  // Create a simple hash of the URL for consistent routing
  let hash = 0
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32-bit integer
  }

  // Use absolute value and modulo to get a value between 0 and 1
  const normalizedHash = Math.abs(hash) / 2147483647 // Max 32-bit int

  return normalizedHash < FIRECRAWL_TRAFFIC_PERCENTAGE
    ? 'firecrawl'
    : 'brightdata'
}

const scrapeWithFirecrawlPrimary = async (
  url: string,
  userPlaceId: string,
  options: CommonOptions,
): Promise<ScrapeResult> => {
  logger.debug({
    msg: `[Scrape Manager] Attempting Firecrawl scraper for ${url}`,
    event: 'firecrawl_scrape_attempt',
    metadata: { url, userPlaceId },
  })

  const { country, ...commonOptions } = options

  const firecrawlResult = await scrapeWithRetry(url, {
    ...commonOptions,
  } as FirecrawlOptions)

  if (firecrawlResult.success) {
    logger.debug({
      msg: `[Scrape Manager] Firecrawl scraper succeeded for ${url}`,
      event: 'firecrawl_scrape_success',
      metadata: { url, userPlaceId },
    })
    return firecrawlResult
  }

  // Fallback to Brightdata if Firecrawl fails
  logger.debug({
    msg: `[Scrape Manager] Firecrawl scraper failed for ${url}, falling back to Brightdata`,
    event: 'firecrawl_scrape_fallback',
    metadata: { url, userPlaceId, firecrawlError: firecrawlResult.error },
  })

  const brightdataResult = await brightdataScraper(url)

  logger.debug({
    msg: `[Scrape Manager] Brightdata fallback result for ${url}`,
    event: 'brightdata_fallback_result',
    metadata: { url, userPlaceId },
  })

  return brightdataResult
}

const scrapeWithBrightdataPrimary = async (
  url: string,
  userPlaceId: string,
  options: CommonOptions,
): Promise<ScrapeResult> => {
  logger.debug({
    msg: `[Scrape Manager] Attempting Brightdata scraper for ${url}`,
    event: 'brightdata_scrape_attempt',
    metadata: { url, userPlaceId },
  })

  const brightdataResult = await brightdataScraper(url)

  if (brightdataResult.success) {
    logger.debug({
      msg: `[Scrape Manager] Brightdata scraper succeeded for ${url}`,
      event: 'brightdata_scrape_success',
      metadata: { url, userPlaceId },
    })
    return brightdataResult
  }

  // Fallback to Firecrawl if Brightdata fails
  logger.debug({
    msg: `[Scrape Manager] Brightdata scraper failed for ${url}, falling back to Firecrawl`,
    event: 'brightdata_scrape_fallback',
    metadata: { url, userPlaceId, brightdataError: brightdataResult.error },
  })

  const { country, ...commonOptions } = options

  const firecrawlResult = await scrapeWithRetry(url, {
    ...commonOptions,
  } as FirecrawlOptions)

  logger.debug({
    msg: `[Scrape Manager] Firecrawl fallback result for ${url}`,
    event: 'firecrawl_fallback_result',
    metadata: { url, userPlaceId },
  })

  return firecrawlResult
}

export const scrapeWithFallbacks = async (
  url: string,
  userPlaceId: string,
  options: CommonOptions,
): Promise<ScrapeResult> => {
  const primaryScraper = getPrimaryScraper(url)

  logger.debug({
    msg: `[Scrape Manager] Primary scraper chosen for ${url}: ${primaryScraper}`,
    event: 'primary_scraper_decision',
    metadata: { url, userPlaceId, primaryScraper },
  })

  switch (primaryScraper) {
    case 'firecrawl':
      return await scrapeWithFirecrawlPrimary(url, userPlaceId, options)
    case 'brightdata':
      return await scrapeWithBrightdataPrimary(url, userPlaceId, options)
    default:
      // Fallback to Brightdata if unknown scraper type
      return await scrapeWithBrightdataPrimary(url, userPlaceId, options)
  }
}
