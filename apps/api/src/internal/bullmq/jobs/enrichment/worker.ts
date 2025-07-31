import { logger } from '@ritchy/logger'
import { type Job, Worker } from 'bullmq'
import { bullmqRedisOptions } from '../..'
import { websiteEnrichmentManager } from '../../../../services/enrichment/website_enrichment_manager'
import type { EnrichmentJobData } from './queue'

const processEnrichmentJob = async (job: Job<EnrichmentJobData>) => {
  const { enrichments, totalCount } = job.data
  const errors: Array<{ userPlaceId: string; error: string }> = []
  let processedCount = 0

  try {
    await Promise.all(
      enrichments.map(async (enrichment) => {
        try {
          await websiteEnrichmentManager({
            userPlaceId: enrichment.userPlaceId,
          })
        } catch (error) {
          errors.push({
            userPlaceId: enrichment.userPlaceId,
            error: error instanceof Error ? error.message : String(error),
          })
          logger.error({
            msg: 'Failed to process enrichment item',
            event: 'enrichment_item_failed',
            metadata: {
              jobId: job.id,
              userPlaceId: enrichment.userPlaceId,
              error: error instanceof Error ? error.message : String(error),
            },
          })
        }

        processedCount++
        const progress = Math.round((processedCount / totalCount) * 100)

        await Promise.all([
          job.updateProgress(progress),
          job.updateData({
            ...job.data,
            processedCount,
            errors,
          }),
        ])

        logger.info({
          msg: 'Enrichment progress update',
          event: 'enrichment_progress',
          metadata: {
            jobId: job.id,
            progress,
            processedCount,
            totalCount,
            errorCount: errors.length,
          },
        })
      }),
    )

    if (errors.length > 0) {
      throw new Error(`Completed with ${errors.length} errors`)
    }

    logger.info({
      msg: 'Enrichment batch completed successfully',
      event: 'enrichment_batch_completed',
      metadata: { jobId: job.id, totalProcessed: processedCount },
    })
  } catch (error) {
    logger.error({
      msg: 'Enrichment batch failed',
      event: 'enrichment_batch_failed',
      metadata: {
        jobId: job.id,
        error: error instanceof Error ? error.message : String(error),
        errorCount: errors.length,
      },
    })
    throw error
  }
}

const worker = new Worker<EnrichmentJobData>(
  'enrichment',
  processEnrichmentJob,
  {
    connection: bullmqRedisOptions,
    concurrency: 20,
  },
)

worker.on('completed', (job) => {
  logger.info({
    msg: 'Enrichment batch job completed',
    event: 'enrichment_batch_success',
    metadata: { jobId: job.id },
  })
})

worker.on('failed', (job, err) => {
  logger.error({
    msg: 'Enrichment batch job failed',
    event: 'enrichment_batch_error',
    metadata: { jobId: job?.id, error: err.message },
  })
})
