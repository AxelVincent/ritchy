import { logger } from '@ritchy/logger'
import type { Request, Response } from 'express'
import { enqueueBulkCompanyEnrichment } from '../../../internal/bullmq/jobs/enrichment-company/queue'
import { upsertEnrichmentsBatch } from '../../../services/enrichment/shared/queries/upsert_enrichments_batch'
import { setBatchCompanyEnrichmentStatus } from '../../../services/enrichment/shared/status/status_manager'
import { getPlacesByUserPlaceIds } from '../../../services/places/queries/get_places_by_user_place_ids'
import type { BulkEnrichmentRequest, BulkEnrichmentResponse } from './contract'

export const bulkEnrichHandler = async (
  req: Request<
    Record<string, never>,
    BulkEnrichmentResponse,
    BulkEnrichmentRequest
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

    if (userPlaceIds.length === 0) {
      res.json({
        success: true,
        message: 'No places to enrich',
        enqueuedCount: 0,
      })
      return
    }

    // Step 1: Batch fetch places by userPlaceIds
    const places = await getPlacesByUserPlaceIds(userPlaceIds)

    if (places.length === 0) {
      res.json({
        success: true,
        message: 'No places found',
        enqueuedCount: 0,
      })
      return
    }

    // Step 2: Create mapping for all places
    const placesWithUserPlaceId = places.map((p) => ({
      userPlaceId: p.user_place_id,
      placeId: p.id,
    }))

    // Step 3: Get unique placeIds and batch upsert enrichment records
    const placeIds = [...new Set(places.map((p) => p.id))]
    const upsertedEnrichments = await upsertEnrichmentsBatch(placeIds)
    const enrichmentIdByPlaceId = new Map(
      upsertedEnrichments.map((e) => [e.placeId, e.id]),
    )

    // Step 4: Batch set Redis status
    await setBatchCompanyEnrichmentStatus(
      placesWithUserPlaceId.map(({ userPlaceId }) => ({
        userPlaceId,
        status: 'queued',
        step: 'Queued for enrichment',
        progress: 0,
      })),
    )

    // Step 5: Batch enqueue jobs (service handles idempotency)
    const jobData = placesWithUserPlaceId
      .map(({ userPlaceId, placeId }) => {
        const enrichmentId = enrichmentIdByPlaceId.get(placeId)
        if (!enrichmentId) return null
        return {
          userPlaceId,
          enrichmentId,
          placeId,
          userId,
        }
      })
      .filter((job): job is NonNullable<typeof job> => job !== null)

    const jobIds = await enqueueBulkCompanyEnrichment(jobData)

    logger.info({
      msg: 'Bulk enrichment jobs enqueued successfully',
      event: 'bulk_enrichment_enqueued',
      metadata: {
        userId,
        enqueuedCount: placesWithUserPlaceId.length,
        jobIds: jobIds.slice(0, 5), // Log first 5 job IDs for debugging
      },
    })

    res.json({
      success: true,
      message: `Successfully enqueued ${placesWithUserPlaceId.length} place(s) for enrichment`,
      enqueuedCount: placesWithUserPlaceId.length,
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
