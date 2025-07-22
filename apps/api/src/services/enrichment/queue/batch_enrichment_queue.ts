import { logger } from '@ritchy/logger'
import type {
  EnrichmentJob,
  EnrichmentJobResult,
  EnrichmentJobStatus
} from '@ritchy/types'
import { ENRICHMENT_STATUS } from '@ritchy/types'
import { QUEUE_CONFIG } from '../../../config/rabbitmq'
import { rabbitMQClient } from '../../../external/rabbitmq/rabbitmq'
import { redisClient } from '../../../external/redis/redis'
import { getMainDomain } from '../../scraper/utils/get_main_domain'

const CONCURRENT_ITEMS = QUEUE_CONFIG.CONCURRENT_ITEMS
const CHUNK_DELAY_MS = QUEUE_CONFIG.CHUNK_DELAY_MS
const CONCURRENT_JOBS = 1 // ✅ Only ONE enrichment job at a time

// Queue initialization state
let isQueueInitialized = false

interface JobProgress {
  jobId: string
  totalMessages: number
  processedMessages: number
  remainingMessages: number
  status: 'processing' | 'completed' | 'error'
  startedAt: string
  completedAt?: string
  errors: string[]
}

const JOB_PROGRESS_PREFIX = 'enrichment_job_progress'
const JOB_PROGRESS_TTL = 24 * 60 * 60 // 24 hours

/**
 * Creates and configures the enrichment job queue using RabbitMQ
 */
const create_enrichment_queue = async (): Promise<void> => {
  if (isQueueInitialized) return

  // Set up job processor
  await rabbitMQClient.processJobs<EnrichmentJob>(
    QUEUE_CONFIG.ENRICHMENT_QUEUE,
    process_enrichment_batch,
    { concurrency: CONCURRENT_JOBS }
  )

  isQueueInitialized = true

  logger.info({
    msg: 'Enrichment queue created with RabbitMQ',
    event: 'enrichment_queue_created',
    metadata: {
      queueName: QUEUE_CONFIG.ENRICHMENT_QUEUE,
      batchSize: CONCURRENT_ITEMS,
      concurrency: CONCURRENT_JOBS
    }
  })
}

/**
 * Processes enrichment batches
 */
const process_enrichment_batch = async (
  jobData: EnrichmentJob,
  messageId: string
): Promise<void> => {
  const { userId, enrichments } = jobData
  const jobId = messageId

  const errors: string[] = []
  let processedCount = 0

  // Process in chunks of CONCURRENT_ITEMS
  for (let i = 0; i < enrichments.length; i += CONCURRENT_ITEMS) {
    const chunk = enrichments.slice(i, i + CONCURRENT_ITEMS)

    // Process all items in this chunk concurrently
    const chunkPromises = chunk.map(async (enrichment) => {
      try {
        const { process_enrichment } = await import(
          '../worker/process_enrichment'
        )
        const result = await process_enrichment(
          {
            userPlaceId: enrichment.userPlaceId,
            domain: getMainDomain(enrichment.website)
          },
          userId,
          messageId
        )

        // Atomically increment processed count
        processedCount++
        await updateJobProgress(jobId, {
          processedMessages: processedCount,
          status:
            processedCount === enrichments.length ? 'completed' : 'processing'
        })

        return result
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error)
        errors.push(`${enrichment.userPlaceId}: ${errorMessage}`)

        logger.error({
          msg: 'Individual enrichment failed in batch',
          event: 'batch_enrichment_item_failed',
          metadata: {
            messageId,
            userPlaceId: enrichment.userPlaceId,
            error: errorMessage
          }
        })

        processedCount++
        await updateJobProgress(jobId, {
          processedMessages: processedCount,
          status:
            processedCount === enrichments.length ? 'completed' : 'processing'
        })

        return null
      }
    })

    // Wait for all concurrent items in this chunk to complete
    await Promise.allSettled(chunkPromises)

    // Delay before next chunk (rate limiting)
    if (i + CONCURRENT_ITEMS < enrichments.length) {
      await new Promise((resolve) => setTimeout(resolve, CHUNK_DELAY_MS))
    }
  }

  // Mark job as completed
  await updateJobProgress(jobId, {
    status: 'completed',
    completedAt: new Date().toISOString(),
    errors
  })

  logger.info({
    msg: 'Batch enrichment job completed',
    event: 'batch_enrichment_complete',
    metadata: {
      messageId,
      userId,
      toProcess: enrichments.length,
      totalProcessed: processedCount,
      successful: processedCount - errors.length,
      failed: errors.length
    }
  })
}

/**
 * Adds enrichment batch to the job queue
 */
export const add_enrichment_batch = async (
  userId: string,
  enrichments: Array<{ userPlaceId: string; website: string }>
): Promise<string> => {
  // Create a single job with all enrichments instead of splitting into batches
  const jobData: EnrichmentJob = {
    userId,
    enrichments // All enrichments in one job
  }

  // Add single job to the queue
  const jobId = await rabbitMQClient.addJob(
    QUEUE_CONFIG.ENRICHMENT_QUEUE,
    jobData
  )

  logger.info({
    msg: 'Enrichment job added to RabbitMQ queue',
    event: 'enrichment_job_queued',
    metadata: {
      userId,
      totalEnrichments: enrichments.length,
      jobId
    }
  })

  // Initialize job progress tracking in Redis
  const initialProgress: JobProgress = {
    jobId,
    totalMessages: enrichments.length,
    processedMessages: 0,
    remainingMessages: enrichments.length,
    status: 'processing',
    startedAt: new Date().toISOString(),
    errors: []
  }

  await redisClient.set(jobId, initialProgress, {
    prefix: JOB_PROGRESS_PREFIX,
    ttl: JOB_PROGRESS_TTL
  })

  return jobId
}

/**
 * Gets the status of a specific job
 */
export const get_job_status = async (
  jobId: string
): Promise<EnrichmentJobStatus> => {
  try {
    // Get job progress from Redis
    const progressData = await redisClient.get<JobProgress>(
      jobId,
      JOB_PROGRESS_PREFIX
    )

    if (!progressData) {
      return {
        status: 'error',
        progress: 0,
        data: {
          jobId,
          totalMessages: 0,
          processedMessages: 0,
          remainingMessages: 0,
          startedAt: '',
          errors: []
        }
      }
    }

    const progress = progressData.data
    const progressPercentage =
      progress.totalMessages > 0
        ? Math.round(
            (progress.processedMessages / progress.totalMessages) * 100
          )
        : 0

    return {
      status: progress.status as 'processing' | 'completed' | 'error',
      progress: progressPercentage,
      data: {
        jobId,
        totalMessages: progress.totalMessages, // ✅ Total messages
        processedMessages: progress.processedMessages, // ✅ Messages processed
        remainingMessages: progress.remainingMessages, // ✅ Messages to process
        startedAt: progress.startedAt,
        completedAt: progress.completedAt,
        errors: progress.errors
      }
    }
  } catch (error) {
    logger.error({
      msg: 'Failed to get job status',
      event: 'job_status_error',
      metadata: {
        jobId,
        error: error instanceof Error ? error.message : String(error)
      }
    })

    return {
      status: 'error',
      progress: 0,
      data: {
        jobId,
        totalMessages: 0,
        processedMessages: 0,
        remainingMessages: 0,
        startedAt: '',
        errors: []
      }
    }
  }
}

/**
 * Gracefully shuts down the enrichment queue
 */
export const shutdown_enrichment_queue = async (): Promise<void> => {
  try {
    await rabbitMQClient.shutdown()
    isQueueInitialized = false

    logger.info({
      msg: 'Enrichment queue shut down successfully',
      event: 'enrichment_queue_shutdown'
    })
  } catch (error) {
    logger.error({
      msg: 'Error shutting down enrichment queue',
      event: 'enrichment_queue_shutdown_error',
      metadata: {
        error: error instanceof Error ? error.message : String(error)
      }
    })
  }
}

/**
 * Initializes the enrichment queue
 */
export const initialize_enrichment_queue = async (): Promise<void> => {
  await create_enrichment_queue()
}

const updateJobProgress = async (
  jobId: string,
  updates: Partial<JobProgress>
): Promise<void> => {
  try {
    const existingProgress = await redisClient.get<JobProgress>(
      jobId,
      JOB_PROGRESS_PREFIX
    )

    if (!existingProgress) return

    const updatedProgress: JobProgress = {
      ...existingProgress.data,
      ...updates,
      remainingMessages:
        existingProgress.data.totalMessages -
        (updates.processedMessages || existingProgress.data.processedMessages)
    }

    await redisClient.set(jobId, updatedProgress, {
      prefix: JOB_PROGRESS_PREFIX,
      ttl: JOB_PROGRESS_TTL
    })
  } catch (error) {
    logger.error({
      msg: 'Failed to update job progress',
      event: 'job_progress_update_error',
      metadata: {
        jobId,
        error: error instanceof Error ? error.message : String(error)
      }
    })
  }
}
