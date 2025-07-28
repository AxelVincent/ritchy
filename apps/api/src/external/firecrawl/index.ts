import FirecrawlApp, { type CrawlScrapeOptions } from '@mendable/firecrawl-js'
import { logger } from '@ritchy/logger'
import { FIRECRAWL_CONFIG } from '../../config/firecrawl'
import { firecrawlApiQueue } from '../../internal/rate_limiter/config'

let firecrawlClient: FirecrawlApp | null = null

const getFirecrawlClient = () => {
  if (!firecrawlClient) {
    firecrawlClient = new FirecrawlApp({ apiKey: FIRECRAWL_CONFIG.API_KEY })
  }
  return firecrawlClient
}

export const scrapeWebsite = async (
  url: string,
  options: CrawlScrapeOptions = {
    formats: ['markdown', 'html', 'rawHtml'],
    excludeTags: ['img'],
    location: {
      country: 'US',
    },
    onlyMainContent: false,
  },
) => {
  try {
    logger.info({
      msg: 'Starting website scrape',
      event: 'firecrawl_scrape_start',
      metadata: {
        url,
        options,
      },
    })

    const app = getFirecrawlClient()
    const scrapeResult = await firecrawlApiQueue.addToQueue(() =>
      app.scrapeUrl(url, options),
    )

    if (!scrapeResult.success) {
      logger.error({
        msg: 'Scrape result indicated failure',
        event: 'firecrawl_scrape_failure',
        metadata: {
          url,
          error: scrapeResult.error,
          rawResult: scrapeResult,
        },
      })
      throw new Error(`Failed to scrape: ${scrapeResult.error}`)
    }

    return scrapeResult
  } catch (error) {
    logger.error({
      msg: 'Error scraping website',
      event: 'firecrawl_scrape_error',
      metadata: {
        url,
        error: {
          name: error instanceof Error ? error.name : 'Unknown',
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          raw: error,
        },
        options,
      },
    })
    throw error
  }
}
