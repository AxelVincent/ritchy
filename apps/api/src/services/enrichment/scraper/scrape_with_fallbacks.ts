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

const USE_FIRECRAWL = true

export const scrapeWithFallbacks = async (
  url: string,
  userPlaceId: string,
  options: CommonOptions,
): Promise<ScrapeResult> => {
  logger.debug({
    msg: `[Scrape Manager] Attempting Brightdata scraper for ${url}`,
    event: 'brightdata_scrape_attempt',
    metadata: { url },
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

  if (USE_FIRECRAWL) {
    logger.debug({
      msg: `[Scrape Manager] Brightdata scraper failed for ${url}, falling back to firecrawl`,
      event: 'brightdata_scrape_fallback',
      metadata: { url, userPlaceId, brightdataError: brightdataResult.error },
    })

    const { country, ...commonOptions } = options

    const result = await scrapeWithRetry(url, {
      ...commonOptions,
    } as FirecrawlOptions)

    logger.debug({
      msg: `[Scrape Manager] Firecrawl scrape result for ${url}`,
      event: 'firecrawl_scrape_result',
      metadata: { url, userPlaceId },
    })

    return result
  }

  return brightdataResult
}
