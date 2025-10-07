import { logger } from '@ritchy/logger'
import { eq } from 'drizzle-orm'
import { db } from '../../db/db'
import { userPlace as userPlaceTable } from '../../db/schema'
import { redisClient } from '../../internal/redis/redis'

export type EnrichmentProgressStatus =
  | 'idle'
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'

export interface EnrichmentStatusData {
  status: EnrichmentProgressStatus
  step: string
  progress: number
  updatedAt: number
  error?: string
  jobId?: string
}

const STATUS_TTL = 30 * 60 // 30 minutes in seconds
const STATUS_KEY_PREFIX = 'enrichment:status'

/**
 * Set enrichment status in Redis with automatic expiration
 */
export const setEnrichmentStatus = async (
  userPlaceId: string,
  status: EnrichmentProgressStatus,
  step: string,
  progress: number,
  jobId?: string,
  error?: string,
): Promise<void> => {
  const key = `${STATUS_KEY_PREFIX}:${userPlaceId}`

  try {
    const statusData: EnrichmentStatusData = {
      status,
      step,
      progress,
      updatedAt: Date.now(),
      ...(error && { error }),
      ...(jobId && { jobId }),
    }

    // Store in Redis with TTL
    await redisClient.redis.setex(key, STATUS_TTL, JSON.stringify(statusData))

    logger.debug({
      msg: 'Enrichment status updated',
      event: 'enrichment_status_updated',
      metadata: { userPlaceId, status, step, progress },
    })

    // If final state, persist to PostgreSQL
    if (status === 'completed' || status === 'failed') {
      await db
        .update(userPlaceTable)
        .set({
          enriched_at: status === 'completed' ? new Date() : null,
          updated_at: new Date(),
        })
        .where(eq(userPlaceTable.id, userPlaceId))

      logger.info({
        msg: 'Enrichment final status persisted to database',
        event: 'enrichment_status_persisted',
        metadata: { userPlaceId, status },
      })
    }
  } catch (error) {
    logger.error({
      msg: 'Failed to set enrichment status',
      event: 'set_enrichment_status_error',
      metadata: {
        userPlaceId,
        error: error instanceof Error ? error.message : String(error),
      },
    })
  }
}

/**
 * Get enrichment status from Redis, fallback to PostgreSQL
 */
export const getEnrichmentStatus = async (
  userPlaceId: string,
): Promise<EnrichmentStatusData> => {
  const key = `${STATUS_KEY_PREFIX}:${userPlaceId}`

  try {
    // Try Redis first
    const data = await redisClient.redis.get(key)

    if (data) {
      return JSON.parse(data) as EnrichmentStatusData
    }

    // Fallback to PostgreSQL for completed enrichments
    const userPlace = await db.query.userPlace.findFirst({
      where: eq(userPlaceTable.id, userPlaceId),
      columns: { enriched_at: true },
    })

    if (userPlace?.enriched_at) {
      return {
        status: 'completed',
        step: 'Enrichment completed',
        progress: 100,
        updatedAt: userPlace.enriched_at.getTime(),
      }
    }

    // Default: idle
    return {
      status: 'idle',
      step: '',
      progress: 0,
      updatedAt: Date.now(),
    }
  } catch (error) {
    logger.error({
      msg: 'Failed to get enrichment status',
      event: 'get_enrichment_status_error',
      metadata: {
        userPlaceId,
        error: error instanceof Error ? error.message : String(error),
      },
    })

    return {
      status: 'idle',
      step: '',
      progress: 0,
      updatedAt: Date.now(),
    }
  }
}

/**
 * Get status for multiple enrichments in a single call (optimized)
 */
export const getBatchEnrichmentStatus = async (
  userPlaceIds: string[],
): Promise<Record<string, EnrichmentStatusData>> => {
  const result: Record<string, EnrichmentStatusData> = {}

  try {
    // Use Redis pipeline for efficiency
    const pipeline = redisClient.redis.pipeline()

    for (const userPlaceId of userPlaceIds) {
      pipeline.get(`${STATUS_KEY_PREFIX}:${userPlaceId}`)
    }

    const results = await pipeline.exec()

    for (let i = 0; i < userPlaceIds.length; i++) {
      const userPlaceId = userPlaceIds[i]
      const [error, data] = results?.[i] ?? [null, null]

      if (!error && data && typeof data === 'string') {
        result[userPlaceId] = JSON.parse(data) as EnrichmentStatusData
      } else {
        // Default to idle if not found
        result[userPlaceId] = {
          status: 'idle',
          step: '',
          progress: 0,
          updatedAt: Date.now(),
        }
      }
    }

    return result
  } catch (error) {
    logger.error({
      msg: 'Failed to get batch enrichment status',
      event: 'get_batch_enrichment_status_error',
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
    })

    // Return idle status for all on error
    for (const userPlaceId of userPlaceIds) {
      result[userPlaceId] = {
        status: 'idle',
        step: '',
        progress: 0,
        updatedAt: Date.now(),
      }
    }

    return result
  }
}

/**
 * Clear enrichment status from Redis
 */
export const clearEnrichmentStatus = async (
  userPlaceId: string,
): Promise<void> => {
  const key = `${STATUS_KEY_PREFIX}:${userPlaceId}`
  await redisClient.redis.del(key)
}
