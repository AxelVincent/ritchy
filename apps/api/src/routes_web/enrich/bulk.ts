import { logger } from '@ritchy/logger'
import type {
  BulkEnrichmentRequestBody,
  BulkEnrichmentResponse,
} from '@ritchy/types'
import type { Request, Response } from 'express'
import {
  enrichmentUnitQueue,
  queueName,
} from '../../internal/bullmq/jobs/enrichment/unit/queue'
import { setEnrichmentStatus } from '../../services/enrichment/status_manager'

/**
 * Bulk enrichment endpoint for processing multiple places
 * @param req Express request with bulk enrichment data
 * @param res Express response
 */
export const bulkEnrich = async (
  req: Request<
    Record<string, never>,
    BulkEnrichmentResponse,
    BulkEnrichmentRequestBody
  >,
  res: Response<BulkEnrichmentResponse>,
): Promise<void> => {
  try {
    const { userPlaceIds } = req.body
    const userId = req.auth.userId

    logger.info({
      msg: 'Processing bulk enrichment request',
      event: 'bulk_enrichment_request',
      metadata: { userId, placeCount: userPlaceIds.length },
    })

    // Add each place to the enrichment queue
    for (const userPlaceId of userPlaceIds) {
      await setEnrichmentStatus(
        userPlaceId,
        'queued',
        'Queued for enrichment',
        0,
      )
      await enrichmentUnitQueue.add(queueName, { userPlaceId })
    }

    logger.info({
      msg: 'Bulk enrichment jobs enqueued successfully',
      event: 'bulk_enrichment_enqueued',
      metadata: { userId, enqueuedCount: userPlaceIds.length },
    })

    res.json({
      success: true,
      message: `Successfully enqueued ${userPlaceIds.length} place(s) for enrichment`,
      enqueuedCount: userPlaceIds.length,
    })
  } catch (error) {
    logger.error({
      msg: 'Bulk enrichment request failed',
      event: 'bulk_enrichment_error',
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        userId: req.auth.userId,
      },
    })

    res.status(500).json({
      success: false,
      message: 'Failed to enqueue places for enrichment',
      enqueuedCount: 0,
    })
  }
}
