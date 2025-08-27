import { logger } from '@ritchy/logger'
import {
  brightdataQueue,
  brightdataQueueEvents,
  enqueueBrightdataJob,
} from '../../internal/bullmq/jobs/brightdata/queue'
import type { BrightdataWebUnlockerResponse } from './web_unlocker'

export const scrapeWithBrightdata = async (
  url: string,
): Promise<BrightdataWebUnlockerResponse> => {
  try {
    const time = Date.now()
    logger.debug({
      msg: '[Brightdata] Starting website scrape',
      event: 'brightdata_scrape_start',
      metadata: { url },
    })
    const result = await enqueueBrightdataJob(url)

    if (!result.success) {
      logger.error({
        msg: '[Brightdata] Scrape result indicated failure',
        event: 'brightdata_scrape_failure',
        metadata: {
          url,
          error: result.error,
          responseTimeInSeconds: (Date.now() - time) / 1000,
        },
      })
      throw new Error(`Failed to scrape: ${result.error}`)
    }

    const responseTimeInSeconds = (Date.now() - time) / 1000
    logger.debug({
      msg: `[Brightdata] Website scraped successfully in ${responseTimeInSeconds} seconds`,
      event: 'brightdata_scrape_success',
      metadata: { url, responseTimeInSeconds },
    })
    return result
  } catch (error) {
    logger.error({
      msg: '[Brightdata] Error scraping website',
      event: 'brightdata_error',
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
    })
    throw error
  }
}
