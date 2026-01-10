import type { CrawlScrapeOptions as FirecrawlOptions } from '@mendable/firecrawl-js'
import { logger } from '@ritchy/logger'
import { scrapeWithRetry } from '../../../../external/firecrawl'
import { brightdataScraper } from './brightdata_scraper'
import { firecrawlSemaphore } from './semaphore'

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

type ScrapeOptions = {
  formats: string[]
  excludeTags: string[]
  onlyMainContent: boolean
  proxy?: string
}

const scrapeWithFirecrawl = async (
  url: string,
  userPlaceId: string,
  options: ScrapeOptions,
): Promise<ScrapeResult | null> => {
  const { acquired, release, current, max } =
    await firecrawlSemaphore.tryAcquire()

  if (!acquired) {
    logger.debug({
      msg: `[Scraper] Firecrawl at capacity (${current}/${max}) for ${url}`,
      event: 'firecrawl_at_capacity',
      metadata: { url, userPlaceId, current, max },
    })
    return null
  }

  logger.debug({
    msg: `[Scraper] Firecrawl slot acquired (${current}/${max}) for ${url}`,
    event: 'firecrawl_slot_acquired',
    metadata: { url, userPlaceId, current, max },
  })

  try {
    const result = await scrapeWithRetry(url, options as FirecrawlOptions)

    if (result.success) {
      logger.debug({
        msg: `[Scraper] Firecrawl succeeded for ${url}`,
        event: 'firecrawl_scrape_success',
        metadata: { url, userPlaceId },
      })
      return result
    }

    logger.debug({
      msg: `[Scraper] Firecrawl failed for ${url}`,
      event: 'firecrawl_scrape_failed',
      metadata: { url, userPlaceId, error: result.error },
    })
    return null
  } catch (error) {
    logger.debug({
      msg: `[Scraper] Firecrawl error for ${url}`,
      event: 'firecrawl_scrape_error',
      metadata: {
        url,
        userPlaceId,
        error: error instanceof Error ? error.message : String(error),
      },
    })
    return null
  } finally {
    await release()
  }
}

export const scrapeWithFallbacks = async (
  url: string,
  userPlaceId: string,
  options: ScrapeOptions,
): Promise<ScrapeResult> => {
  // Try Firecrawl first (returns null if at capacity or failed)
  const firecrawlResult = await scrapeWithFirecrawl(url, userPlaceId, options)

  if (firecrawlResult) {
    return firecrawlResult
  }

  // Fallback to Brightdata
  logger.debug({
    msg: `[Scraper] Using Brightdata for ${url}`,
    event: 'brightdata_scrape_attempt',
    metadata: { url, userPlaceId },
  })

  return brightdataScraper(url)
}
