import 'dotenv/config'

import { logger } from '@ritchy/logger'
import type { SandboxedJob } from 'bullmq'
import { UnrecoverableError } from 'bullmq'
import { scrapeWebsiteManager } from '../../../../services/enrichment/scraper/scrape_website_manager'
import { extractErrorMessage } from '../../utils/extract-error-message'
import { tryGarbageCollect } from '../../utils/gc'
import {
  getMemoryDelta,
  getMemorySnapshot,
  logMemorySnapshot,
} from '../../utils/memory-tracker'

export interface ScraperJobData {
  url: string
  enrichmentId: string
  onlyMainContent: boolean
  userPlaceId: string
}

/**
 * Sandboxed processor for scraper jobs.
 *
 * This is the most memory-intensive worker due to Cheerio/JSDOM usage.
 * Running in a separate thread isolates memory spikes from other workers.
 *
 * NOTE: Batch exit for memory cleanup is handled in worker.ts via the
 * 'completed' event, NOT here. Calling process.exit() from within the
 * sandbox races with BullMQ's result handling and causes job failures.
 */
export default async function (job: SandboxedJob<ScraperJobData>) {
  const { url, enrichmentId, onlyMainContent, userPlaceId } = job.data
  const beforeSnapshot = getMemorySnapshot()

  try {
    logger.info({
      msg: 'Starting scraper job in sandbox',
      metadata: { jobId: job.id, url },
      event: 'scraper_sandbox_started',
    })

    const result = await scrapeWebsiteManager(
      url,
      enrichmentId,
      onlyMainContent,
      userPlaceId,
    )

    const afterSnapshot = getMemorySnapshot()
    const delta = getMemoryDelta(beforeSnapshot, afterSnapshot)

    // Log memory if heap grew more than 5MB
    if (delta.heapUsed > 5 * 1024 * 1024) {
      logMemorySnapshot(
        'scraper_job_high_memory',
        'scraper',
        job.id,
        afterSnapshot,
        delta,
      )
    }

    logger.info({
      msg: 'Scraper job completed in sandbox',
      metadata: {
        jobId: job.id,
        memoryDeltaMB: (delta.heapUsed / 1024 / 1024).toFixed(2),
      },
      event: 'scraper_sandbox_completed',
    })

    return result
  } catch (error) {
    const errorMessage = extractErrorMessage(error)

    logger.error({
      msg: 'Scraper job failed in sandbox',
      metadata: {
        jobId: job.id,
        url,
        error: errorMessage,
      },
      event: 'scraper_sandbox_failed',
    })

    throw new UnrecoverableError(errorMessage)
  } finally {
    // Trigger garbage collection after each job to prevent memory buildup
    tryGarbageCollect('scraper', job.id)
  }
}
