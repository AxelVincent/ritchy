import FirecrawlApp, { type CrawlScrapeOptions } from '@mendable/firecrawl-js'
import { logger } from '@ritchy/logger'
import { FIRECRAWL_CONFIG } from '../../config/firecrawl'
import {
  firecrawlQueue,
  firecrawlQueueEvents
} from '../../internal/bullmq/jobs/firecrawl/queue'
import type { ScrapeResult } from '../../services/enrichment/scraper/scrape_with_feature_flag'

let firecrawlClient: FirecrawlApp | null = null

export const getFirecrawlClient = () => {
  if (!firecrawlClient) {
    firecrawlClient = new FirecrawlApp({ apiKey: FIRECRAWL_CONFIG.API_KEY })
  }
  return firecrawlClient
}

export const scrapeWithRetry = async (
  url: string,
  options: CrawlScrapeOptions = {
    formats: ['markdown', 'html', 'rawHtml'],
    excludeTags: ['img'],
    location: {
      country: 'US'
    },
    onlyMainContent: false
  }
): Promise<ScrapeResult> => {
  try {
    const time = Date.now()
    logger.info({
      msg: '[Firecrawl] Starting website scrape',
      event: 'firecrawl_scrape_start',
      metadata: {
        url,
        options
      }
    })

    const job = await firecrawlQueue.add('firecrawl-api', { url, options })
    let scrapeResult = await job.waitUntilFinished(firecrawlQueueEvents)

    if (!scrapeResult.success) {
      logger.error({
        msg: '[Firecrawl] Scrape result indicated failure',
        event: 'firecrawl_scrape_failure',
        metadata: {
          url,
          error: scrapeResult.error,
          rawResult: scrapeResult,
          responseTimeInSeconds: (Date.now() - time) / 1000
        }
      })
      throw new Error(`Failed to scrape: ${scrapeResult.error}`)
    }

    // Check if we got an error status code
    const statusCode = scrapeResult.metadata?.statusCode
    if (statusCode && [401, 403, 408, 500].includes(statusCode)) {
      logger.info({
        msg: `[Firecrawl] Got status code ${statusCode}, retrying with stealth proxy`,
        event: 'firecrawl_scrape_retry_with_stealth_proxy',
        metadata: {
          url,
          statusCode,
          responseTimeInSeconds: (Date.now() - time) / 1000
        }
      })
      // Retry with stealth proxy
      const job = await firecrawlQueue.add('firecrawl-api', {
        url,
        options: {
          ...options,
          proxy: 'stealth'
        }
      })
      scrapeResult = await job.waitUntilFinished(firecrawlQueueEvents)
      if (!scrapeResult.success) {
        logger.error({
          msg: '[Firecrawl] Scrape result indicated failure',
          event: 'firecrawl_scrape_failure',
          metadata: {
            url,
            error: scrapeResult.error,
            rawResult: scrapeResult,
            responseTimeInSeconds: (Date.now() - time) / 1000
          }
        })
        throw new Error(`Failed to scrape: ${scrapeResult.error}`)
      }
    }

    const responseTimeInSeconds = (Date.now() - time) / 1000
    logger.info({
      msg: `[Firecrawl] Website scraped successfully in ${responseTimeInSeconds} seconds`,
      event: 'firecrawl_scrape_success',
      metadata: { url, responseTimeInSeconds, options }
    })

    return scrapeResult
  } catch (error) {
    logger.warn({
      msg: '[Firecrawl] Error scraping website, retrying with stealth proxy',
      event: 'firecrawl_scrape_error',
      metadata: {
        url,
        error: {
          name: error instanceof Error ? error.name : 'Unknown',
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          raw: error
        },
        options
      }
    })
    try {
      const job = await firecrawlQueue.add('firecrawl-api', {
        url,
        options: {
          ...options,
          proxy: 'stealth'
        }
      })
      const stealthScrapeResult =
        await job.waitUntilFinished(firecrawlQueueEvents)
      if (!stealthScrapeResult.success) {
        logger.error({
          msg: '[Firecrawl] Scrape result indicated failure',
          event: 'firecrawl_scrape_failure',
          metadata: {
            url,
            error: stealthScrapeResult.error,
            rawResult: stealthScrapeResult
          }
        })
        throw new Error(`Failed to scrape: ${stealthScrapeResult.error}`)
      }
      return stealthScrapeResult
    } catch (error) {
      logger.error({
        msg: '[Firecrawl] Error scraping website',
        event: 'firecrawl_scrape_error',
        metadata: {
          url,
          error: {
            name: error instanceof Error ? error.name : 'Unknown',
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            raw: error
          },
          options
        }
      })
      throw error
    }
  }
}
