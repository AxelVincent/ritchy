import { logger } from '@ritchy/logger'
import type {
  BulkEnrichmentRequestBody,
  BulkEnrichmentResponse,
} from '@ritchy/types'
import type { Request, Response } from 'express'
import { enqueueBulkCompanyEnrichment } from '../../internal/bullmq/jobs/enrichment-company/queue'
import { getEnrichmentsByPlaceIds } from '../../services/enrichment/queries/get_enrichments_by_place_ids'
import { upsertEnrichmentsBatch } from '../../services/enrichment/queries/upsert_enrichments_batch'
import { setBatchCompanyEnrichmentStatus } from '../../services/enrichment/status_manager'
import { getPlacesByUserPlaceIds } from '../../services/places/queries/get_places_by_user_place_ids'

/**
 * Bulk enrichment endpoint for processing multiple places.
 * Optimized with batch queries to avoid N+1 performance issues.
 *
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
    const userPlaceIdToPlaceId = new Map(
      places.map((p) => [p.user_place_id, p.id]),
    )

    if (places.length === 0) {
      res.json({
        success: true,
        message: 'No places found',
        enqueuedCount: 0,
      })
      return
    }

    // Step 2: Get unique placeIds
    const placeIds = [...new Set(places.map((p) => p.id))]

    // Step 3: Batch fetch existing enrichments
    const existingEnrichments = await getEnrichmentsByPlaceIds(placeIds)
    const enrichmentByPlaceId = new Map(
      existingEnrichments.map((e) => [e.placeId, e]),
    )

    // Step 4: Filter eligible places (not already enriched/processing/queued)
    const eligiblePlaces: Array<{ userPlaceId: string; placeId: string }> = []

    for (const userPlaceId of userPlaceIds) {
      const placeId = userPlaceIdToPlaceId.get(userPlaceId)
      if (!placeId) continue

      const enrichment = enrichmentByPlaceId.get(placeId)
      if (
        enrichment?.companyStatus === 'completed' ||
        enrichment?.companyStatus === 'queued' ||
        enrichment?.companyStatus === 'processing'
      ) {
        logger.debug({
          msg: 'Skipping enrichment - already enriched or in progress',
          event: 'bulk_enrichment_skip',
          metadata: {
            userPlaceId,
            placeId,
            companyStatus: enrichment.companyStatus,
          },
        })
        continue
      }

      eligiblePlaces.push({ userPlaceId, placeId })
    }

    if (eligiblePlaces.length === 0) {
      logger.info({
        msg: 'No eligible places for enrichment',
        event: 'bulk_enrichment_no_eligible',
        metadata: { userId, totalRequested: userPlaceIds.length },
      })
      res.json({
        success: true,
        message: 'No places need enrichment',
        enqueuedCount: 0,
      })
      return
    }

    // Step 5: Batch upsert enrichment records
    const eligiblePlaceIds = eligiblePlaces.map((p) => p.placeId)
    const upsertedEnrichments = await upsertEnrichmentsBatch(eligiblePlaceIds)
    const enrichmentIdByPlaceId = new Map(
      upsertedEnrichments.map((e) => [e.placeId, e.id]),
    )

    // Step 6: Batch set Redis status
    await setBatchCompanyEnrichmentStatus(
      eligiblePlaces.map(({ userPlaceId }) => ({
        userPlaceId,
        status: 'queued',
        step: 'Queued for enrichment',
        progress: 0,
      })),
    )

    // Step 7: Batch enqueue jobs
    const jobData = eligiblePlaces
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
        enqueuedCount: eligiblePlaces.length,
        jobIds: jobIds.slice(0, 5), // Log first 5 job IDs for debugging
      },
    })

    res.json({
      success: true,
      message: `Successfully enqueued ${eligiblePlaces.length} place(s) for enrichment`,
      enqueuedCount: eligiblePlaces.length,
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
