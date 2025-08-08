import type { CrawlScrapeOptions as FirecrawlOptions } from '@mendable/firecrawl-js'
import { logger } from '@ritchy/logger'
import type { CrawlScrapeOptions as ScrapelessOptions } from '@scrapeless-ai/sdk'
import { scrapeWithRetry } from '../../../external/firecrawl'
import { scrapeUrl } from '../../../external/scrapeless'

// Feature flag percentage (50%)
const SCRAPELESS_PERCENTAGE = 100

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

export const scrapeWithFeatureFlag = async (
  url: string,
  options: CommonOptions
): Promise<ScrapeResult> => {
  const useScrapeless = Math.random() * 100 < SCRAPELESS_PERCENTAGE

  logger.info({
    msg: '[Scrape Manager] Using service',
    event: 'scrape_service_selection',
    metadata: { service: useScrapeless ? 'scrapeless' : 'firecrawl', url }
  })

  const { country, ...commonOptions } = options

  const result = useScrapeless
    ? await scrapeUrl(url, commonOptions as ScrapelessOptions)
    : await scrapeWithRetry(url, {
        ...commonOptions,
        location: country ? { country } : undefined
      } as FirecrawlOptions)

  logger.info({
    msg: '[Scrape Manager] Scrape result',
    event: 'scrape_result',
    metadata: { result, useScrapeless }
  })

  return result
}
