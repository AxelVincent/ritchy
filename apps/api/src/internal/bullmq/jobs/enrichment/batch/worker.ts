import { logger } from '@ritchy/logger'
import { type Job, Worker } from 'bullmq'
import { bullmqRedisOptions } from '../../../config'
import { enqueueEnrichmentUnitJob } from '../unit/queue'
import { type EnrichmentBatchJobData, queueName } from './queue'

const processEnrichmentBatchJob = async (job: Job<EnrichmentBatchJobData>) => {
  const { enrichments, totalCount } = job.data
  const errors: Array<{ userPlaceId: string; error: string }> = []
  const successes: Array<{ userPlaceId: string }> = []
  let completedCount = 0

  // Helper function to safely update progress and data
  const updateProgress = async () => {
    const progress = Math.round((completedCount / totalCount) * 100)
    await Promise.all([
      job.updateProgress(progress),
      job.updateData({
        ...job.data,
        processedCount: completedCount,
        successCount: successes.length,
        errorCount: errors.length,
        successRate: completedCount > 0 ? successes.length / completedCount : 0,
        errors,
        successes,
      }),
    ])
  }

  try {
    // Process enrichments in parallel for better performance
    const enrichmentPromises = enrichments.map(async (enrichment) => {
      try {
        await enqueueEnrichmentUnitJob(enrichment.userPlaceId)

        // Update progress atomically
        completedCount++
        successes.push({ userPlaceId: enrichment.userPlaceId })
        await updateProgress()

        return { success: true, userPlaceId: enrichment.userPlaceId }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error)

        // Still count as completed for progress
        completedCount++
        errors.push({
          userPlaceId: enrichment.userPlaceId,
          error: errorMessage,
        })
        await updateProgress()

        return {
          success: false,
          userPlaceId: enrichment.userPlaceId,
          error: errorMessage,
        }
      }
    })

    // Wait for all enrichments to complete
    const results = await Promise.allSettled(enrichmentPromises)

    // Process results
    for (const result of results) {
      if (result.status === 'fulfilled') {
        if (result.value.success) {
          successes.push({ userPlaceId: result.value.userPlaceId })
        } else {
          errors.push({
            userPlaceId: result.value.userPlaceId,
            error: result.value.error || 'Unknown error',
          })
        }
      } else {
        // This shouldn't happen with Promise.allSettled, but just in case
        errors.push({
          userPlaceId: 'unknown',
          error: result.reason?.message || 'Unknown error',
        })
      }
    }
    const processedCount = completedCount
    const successRate = successes.length / totalCount

    // Update job progress and data
    await Promise.all([
      job.updateProgress(Math.round((processedCount / totalCount) * 100)),
      job.updateData({
        ...job.data,
        processedCount,
        successCount: successes.length,
        errorCount: errors.length,
        successRate,
        errors,
        successes,
      }),
    ])

    logger.info({
      msg: 'Enrichment progress update',
      event: 'enrichment_progress',
      metadata: {
        jobId: job.id,
        progress: Math.round((processedCount / totalCount) * 100),
        processedCount,
        totalCount,
        successCount: successes.length,
        errorCount: errors.length,
        successRate,
      },
    })

    // Determine batch success based on success rate
    if (successRate === 1) {
      // Perfect success - all enrichments processed
      logger.info({
        msg: 'Enrichment batch completed with 100% success',
        event: 'enrichment_batch_perfect_success',
        metadata: {
          jobId: job.id,
          totalProcessed: processedCount,
          successCount: successes.length,
          errorCount: errors.length,
        },
      })
    } else if (successRate >= 0.8) {
      // Good success rate (80%+) - log as completed with warnings
      logger.warn({
        msg: `Enrichment batch completed with ${Math.round(successRate * 100)}% success rate`,
        event: 'enrichment_batch_partial_success',
        metadata: {
          jobId: job.id,
          totalProcessed: processedCount,
          successCount: successes.length,
          errorCount: errors.length,
          successRate: Math.round(successRate * 100),
        },
      })
    } else if (successRate >= 0.5) {
      // Moderate success rate (50-79%) - mark as failed but don't retry
      logger.error({
        msg: `Enrichment batch completed with low success rate: ${Math.round(successRate * 100)}%`,
        event: 'enrichment_batch_low_success',
        metadata: {
          jobId: job.id,
          totalProcessed: processedCount,
          successCount: successes.length,
          errorCount: errors.length,
          successRate: Math.round(successRate * 100),
        },
      })
      throw new Error(
        `Low success rate: ${Math.round(successRate * 100)}% (${successes.length}/${totalCount} succeeded)`,
      )
    } else {
      // Poor success rate (<50%) - mark as failed and allow retry
      logger.error({
        msg: `Enrichment batch failed with poor success rate: ${Math.round(successRate * 100)}%`,
        event: 'enrichment_batch_poor_success',
        metadata: {
          jobId: job.id,
          totalProcessed: processedCount,
          successCount: successes.length,
          errorCount: errors.length,
          successRate: Math.round(successRate * 100),
        },
      })
      throw new Error(
        `Poor success rate: ${Math.round(successRate * 100)}% (${successes.length}/${totalCount} succeeded)`,
      )
    }

    // Return detailed results for successful batches
    return {
      totalProcessed: processedCount,
      successCount: successes.length,
      errorCount: errors.length,
      successRate: Math.round(successRate * 100),
      errors,
      successes,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    logger.error({
      msg: 'Enrichment batch processing failed',
      event: 'enrichment_batch_processing_failed',
      metadata: {
        jobId: job.id,
        error: errorMessage,
        totalProcessed: enrichments.length,
        successCount: successes.length,
        errorCount: errors.length,
        successRate:
          enrichments.length > 0
            ? Math.round((successes.length / enrichments.length) * 100)
            : 0,
      },
    })

    throw error
  }
}

const worker = new Worker<EnrichmentBatchJobData>(
  queueName,
  processEnrichmentBatchJob,
  {
    connection: bullmqRedisOptions,
    concurrency: 10,
    lockDuration: 60000, // 60 seconds
    lockRenewTime: 30000, // 30 seconds
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
