import FirecrawlApp, { type CrawlScrapeOptions } from '@mendable/firecrawl-js'
import { logger } from '@ritchy/logger'

import { FIRECRAWL_CONFIG } from '../../config/firecrawl'
import {
  enqueueFirecrawlJob,
  firecrawlQueue,
} from '../../internal/bullmq/jobs/firecrawl/queue'
import { pollJobResult } from '../../internal/bullmq/utils/poll-job-result'
import {
  createSimpleDurationTimer,
  externalApiDurationHistogram,
  externalApiRequestsCounter,
} from '../../metrics/collectors'
import type { ScrapeResult } from '../../services/enrichment/company/scraper/scrape_with_fallbacks'

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
      country: 'US',
    },
    onlyMainContent: false,
  },
): Promise<ScrapeResult> => {
  const metricsTimer = createSimpleDurationTimer(externalApiDurationHistogram)
  let httpStatusCode = '500'

  try {
    const time = Date.now()
    logger.info({
      msg: '[Firecrawl] Starting website scrape',
      event: 'firecrawl_scrape_start',
      metadata: {
        url,
        options,
      },
    })

    const scrapeResult = await enqueueFirecrawlJob(url, options)

    if (!scrapeResult.success) {
      httpStatusCode = '400'
      metricsTimer.stop({ service: 'firecrawl', endpoint: 'scrape' })
      externalApiRequestsCounter.inc({
        service: 'firecrawl',
        endpoint: 'scrape',
        status_code: httpStatusCode,
      })

      logger.error({
        msg: '[Firecrawl] Scrape result indicated failure',
        event: 'firecrawl_scrape_failure',
        metadata: {
          url,
          error: scrapeResult.error,
          responseTimeInSeconds: (Date.now() - time) / 1000,
        },
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
          responseTimeInSeconds: (Date.now() - time) / 1000,
        },
      })
      // Retry with stealth proxy
      const stealthScrapeResult = await enqueueFirecrawlJob(url, {
        ...options,
        proxy: 'stealth',
      })
      if (!stealthScrapeResult.success) {
        httpStatusCode = '400'
        metricsTimer.stop({ service: 'firecrawl', endpoint: 'scrape' })
        externalApiRequestsCounter.inc({
          service: 'firecrawl',
          endpoint: 'scrape',
          status_code: httpStatusCode,
        })

        logger.error({
          msg: '[Firecrawl] Scrape result indicated failure',
          event: 'firecrawl_scrape_failure',
          metadata: {
            url,
            error: stealthScrapeResult.error,
            responseTimeInSeconds: (Date.now() - time) / 1000,
          },
        })
        throw new Error(`Failed to scrape: ${stealthScrapeResult.error}`)
      }

      httpStatusCode = '200'
      metricsTimer.stop({ service: 'firecrawl', endpoint: 'scrape' })
      externalApiRequestsCounter.inc({
        service: 'firecrawl',
        endpoint: 'scrape',
        status_code: httpStatusCode,
      })

      return stealthScrapeResult
    }

    const responseTimeInSeconds = (Date.now() - time) / 1000
    logger.info({
      msg: `[Firecrawl] Website scraped successfully in ${responseTimeInSeconds} seconds`,
      event: 'firecrawl_scrape_success',
      metadata: { url, responseTimeInSeconds, options },
    })

    httpStatusCode = '200'
    metricsTimer.stop({ service: 'firecrawl', endpoint: 'scrape' })
    externalApiRequestsCounter.inc({
      service: 'firecrawl',
      endpoint: 'scrape',
      status_code: httpStatusCode,
    })

    return scrapeResult
  } catch (error) {
    if (httpStatusCode === '500') {
      metricsTimer.stop({ service: 'firecrawl', endpoint: 'scrape' })
      externalApiRequestsCounter.inc({
        service: 'firecrawl',
        endpoint: 'scrape',
        status_code: httpStatusCode,
      })
    }

    logger.warn({
      msg: '[Firecrawl] Error scraping website, retrying with stealth proxy',
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
    try {
      const job = await firecrawlQueue.add('firecrawl-api', {
        url,
        options: {
          ...options,
          proxy: 'stealth',
        },
      })

      if (!job.id) {
        throw new Error('Failed to create firecrawl job - no job ID returned')
      }

      // Use polling instead of QueueEvents to avoid memory leaks
      const stealthScrapeResult = await pollJobResult(firecrawlQueue, job.id, {
        interval: 200,
        timeout: 300000, // 5 minutes
      })
      if (!stealthScrapeResult.success) {
        httpStatusCode = '400'
        metricsTimer.stop({ service: 'firecrawl', endpoint: 'scrape' })
        externalApiRequestsCounter.inc({
          service: 'firecrawl',
          endpoint: 'scrape',
          status_code: httpStatusCode,
        })

        logger.error({
          msg: '[Firecrawl] Scrape result indicated failure',
          event: 'firecrawl_scrape_failure',
          metadata: {
            url,
            error: stealthScrapeResult.error,
          },
        })
        throw new Error(`Failed to scrape: ${stealthScrapeResult.error}`)
      }

      httpStatusCode = '200'
      metricsTimer.stop({ service: 'firecrawl', endpoint: 'scrape' })
      externalApiRequestsCounter.inc({
        service: 'firecrawl',
        endpoint: 'scrape',
        status_code: httpStatusCode,
      })

      return stealthScrapeResult
    } catch (error) {
      if (httpStatusCode === '500') {
        metricsTimer.stop({ service: 'firecrawl', endpoint: 'scrape' })
        externalApiRequestsCounter.inc({
          service: 'firecrawl',
          endpoint: 'scrape',
          status_code: httpStatusCode,
        })
      }

      logger.error({
        msg: '[Firecrawl] Error scraping website',
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
}
