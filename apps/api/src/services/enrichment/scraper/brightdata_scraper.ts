import { logger } from '@ritchy/logger'
import { scrapeWithBrightdata } from '../../../external/brightdata'
import type { ScrapeResult } from './scrape_with_fallbacks'
import { processHtml } from './utils/process_html'

export const brightdataScraper = async (url: string): Promise<ScrapeResult> => {
  logger.info({
    msg: `[Brightdata scraper] Starting scraping ${url}`,
    event: 'brightdata_scraper_start',
    metadata: { url },
  })

  try {
    const startTime = new Date()

    const { body: html, status_code: statusCode } =
      await scrapeWithBrightdata(url)

    const { sanitizedHtml, markdown } = processHtml(html, url)

    const endTime = new Date()
    const responseTimeInSeconds =
      (endTime.getTime() - startTime.getTime()) / 1000

    logger.info({
      msg: `[Brightdata scraper] Completed scraping ${url} in ${responseTimeInSeconds} seconds`,
      event: 'brightdata_scraper_completed',
      metadata: { url },
    })

    return {
      success: true,
      status: 'success',
      markdown,
      html: sanitizedHtml,
      rawHtml: html,
      metadata: {
        statusCode,
        responseTimeInSeconds,
      },
    }
  } catch (error) {
    logger.error({
      msg: `[Brightdata scraper] Error scraping ${url}`,
      event: 'brightdata_scraper_error',
      metadata: { url, error },
    })
    return {
      success: false,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
