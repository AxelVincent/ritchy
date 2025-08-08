import { logger } from '@ritchy/logger'
import { type CrawlScrapeOptions, ScrapingCrawl } from '@scrapeless-ai/sdk'
import { SCRAPELESS_CONFIG } from '../../config/scrapeless'
import {
  scrapelessQueue,
  scrapelessQueueEvents
} from '../../internal/bullmq/jobs/scrapeless/queue'
import type { ScrapeResult } from '../../services/enrichment/scraper/scrape_with_feature_flag'

let client: ScrapingCrawl | null = null

type ScrapelessScrapeResult = {
  success: boolean
  status: string
  data: {
    html?: string
    rawHtml?: string
    markdown?: string
  }
}

const getScrapelessClient = () => {
  if (!client) {
    client = new ScrapingCrawl({
      apiKey: SCRAPELESS_CONFIG.API_KEY
    })
  }
  return client
}

export const scrapeUrl = async (
  url: string,
  options: CrawlScrapeOptions = {
    formats: ['markdown', 'html', 'rawHtml'],
    excludeTags: ['img'],
    onlyMainContent: false,
    timeout: 30000
  }
): Promise<ScrapeResult> => {
  try {
    const time = Date.now()
    const job = await scrapelessQueue.add('scrapeless-api', { url, options })
    const scrapeResult: ScrapelessScrapeResult = await job.waitUntilFinished(
      scrapelessQueueEvents
    )

    if (!scrapeResult.success) {
      logger.error({
        msg: '[Firecrawl] Scrape result indicated failure',
        event: 'firecrawl_scrape_failure',
        metadata: {
          url,
          error: scrapeResult.status,
          rawResult: scrapeResult,
          responseTimeInSeconds: (Date.now() - time) / 1000
        }
      })
      throw new Error(`Failed to scrape: ${scrapeResult.status}`)
    }

    const responseTimeInSeconds = (Date.now() - time) / 1000
    logger.info({
      msg: `[Scrapeless] Website scraped successfully in ${responseTimeInSeconds} seconds`,
      event: 'scrapeless_success',
      metadata: { url, responseTimeInSeconds, scrapeResult }
    })

    return {
      success: scrapeResult.success,
      status: scrapeResult.status,
      html: scrapeResult.data.html,
      rawHtml: scrapeResult.data.rawHtml,
      markdown: scrapeResult.data.markdown
    }
  } catch (error) {
    logger.error({
      msg: '[Scrapeless] Error scraping website',
      event: 'scrapeless_error',
      metadata: {
        url,
        error: error instanceof Error ? error.message : String(error)
      }
    })
    throw error
  }
}

export { getScrapelessClient }
