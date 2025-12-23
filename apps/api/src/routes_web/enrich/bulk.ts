import { logger } from '@ritchy/logger'
import type {
  BulkEnrichmentRequestBody,
  BulkEnrichmentResponse,
} from '@ritchy/types'
import { eq } from 'drizzle-orm'
import type { Request, Response } from 'express'
import { db } from '../../db/db'
import { enrichment as enrichmentTable, userPlace } from '../../db/schema'
import { enqueueCompanyEnrichment } from '../../internal/bullmq/jobs/enrichment-company/queue'
import { setCompanyEnrichmentStatus } from '../../services/enrichment/status_manager'
import { getPlaceByUserPlaceId } from '../../services/places/queries/get_place_by_user_place_id'

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

    let enqueuedCount = 0

    // Add each place to the enrichment queue
    for (const userPlaceId of userPlaceIds) {
      // Verify user has access to this userPlace
      const [userPlaceRecord] = await db
        .select({ id: userPlace.id, place_id: userPlace.place_id })
        .from(userPlace)
        .where(eq(userPlace.id, userPlaceId))
        .limit(1)

      if (!userPlaceRecord) {
        logger.debug({
          msg: 'Skipping enrichment - userPlace not found',
          event: 'bulk_enrichment_skip',
          metadata: { userPlaceId, reason: 'userPlace_not_found' },
        })
        continue
      }

      // Get place data
      const place = await getPlaceByUserPlaceId(userPlaceId)
      if (!place) {
        logger.debug({
          msg: 'Skipping enrichment - place not found',
          event: 'bulk_enrichment_skip',
          metadata: { userPlaceId, reason: 'place_not_found' },
        })
        continue
      }

      // Get or create enrichment record
      let [existingEnrichment] = await db
        .select({
          id: enrichmentTable.id,
          companyStatus: enrichmentTable.companyStatus,
        })
        .from(enrichmentTable)
        .where(eq(enrichmentTable.placeId, place.id))
        .limit(1)

      logger.debug({
        msg: 'Checking enrichment status',
        event: 'bulk_enrichment_status_check',
        metadata: {
          userPlaceId,
          placeId: place.id,
          existingEnrichmentId: existingEnrichment?.id ?? null,
          companyStatus: existingEnrichment?.companyStatus ?? null,
        },
      })

      // Skip if already enriched or in progress
      if (
        existingEnrichment?.companyStatus === 'completed' ||
        existingEnrichment?.companyStatus === 'queued' ||
        existingEnrichment?.companyStatus === 'processing'
      ) {
        logger.debug({
          msg: 'Skipping enrichment - already enriched or in progress',
          event: 'bulk_enrichment_skip',
          metadata: {
            userPlaceId,
            placeId: place.id,
            enrichmentId: existingEnrichment.id,
            companyStatus: existingEnrichment.companyStatus,
            reason: 'status_not_eligible',
          },
        })
        continue
      }

      // Create enrichment record if doesn't exist
      if (!existingEnrichment) {
        const [newEnrichment] = await db
          .insert(enrichmentTable)
          .values({
            placeId: place.id,
            companyStatus: 'queued',
          })
          .returning({ id: enrichmentTable.id })

        existingEnrichment = { id: newEnrichment.id, companyStatus: 'queued' }
      } else {
        // Update existing record to queued
        await db
          .update(enrichmentTable)
          .set({ companyStatus: 'queued' })
          .where(eq(enrichmentTable.id, existingEnrichment.id))
      }

      await setCompanyEnrichmentStatus(
        userPlaceId,
        'queued',
        'Queued for enrichment',
        0,
      )

      const jobId = await enqueueCompanyEnrichment({
        userPlaceId,
        enrichmentId: existingEnrichment.id,
        placeId: place.id,
        userId,
      })

      logger.debug({
        msg: 'Company enrichment job enqueued',
        event: 'bulk_enrichment_job_enqueued',
        metadata: {
          userPlaceId,
          placeId: place.id,
          enrichmentId: existingEnrichment.id,
          jobId,
        },
      })

      enqueuedCount++
    }

    logger.info({
      msg: 'Bulk enrichment jobs enqueued successfully',
      event: 'bulk_enrichment_enqueued',
      metadata: { userId, enqueuedCount },
    })

    res.json({
      success: true,
      message: `Successfully enqueued ${enqueuedCount} place(s) for enrichment`,
      enqueuedCount,
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
