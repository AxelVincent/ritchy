import { logger } from '@ritchy/logger'
import { eq } from 'drizzle-orm'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { db } from '../../db/db'
import { enrichment as enrichmentTable, userPlace } from '../../db/schema'
import { enqueueCompanyEnrichment } from '../../internal/bullmq/jobs/enrichment-company/queue'
import { COMPANY_CREDITS } from '../../services/enrichment/shared/config/constants'
import { setCompanyEnrichmentStatus } from '../../services/enrichment/shared/status/status_manager'
import { getPlaceByUserPlaceId } from '../../services/places/queries/get_place_by_user_place_id'

const EnrichCompanyBodySchema = z.object({
  userPlaceId: z.string().uuid(),
})

export interface EnrichCompanyResponse {
  success: boolean
  message: string
  enrichmentId?: string
  credits: number
}

/**
 * Company enrichment endpoint
 *
 * Enqueues a company for enrichment (website scraping, company data, officers list).
 * Costs 1 credit.
 *
 * This route is simplified - it validates, creates enrichment record, and enqueues.
 * The service layer handles idempotency (returns cached data if already enriched).
 *
 * POST /enrich/company
 * Body: { userPlaceId: string }
 */
export const enrichCompany = async (
  req: Request<
    Record<string, never>,
    EnrichCompanyResponse,
    { userPlaceId: string }
  >,
  res: Response<EnrichCompanyResponse>,
): Promise<void> => {
  try {
    const { userPlaceId } = EnrichCompanyBodySchema.parse(req.body)
    const userId = req.auth.userId

    logger.info({
      msg: 'Processing company enrichment request',
      event: 'company_enrichment_request',
      metadata: { userId, userPlaceId },
    })

    // Verify user has access to this userPlace
    const [userPlaceRecord] = await db
      .select({ id: userPlace.id, place_id: userPlace.place_id })
      .from(userPlace)
      .where(eq(userPlace.id, userPlaceId))
      .limit(1)

    if (!userPlaceRecord) {
      res.status(404).json({
        success: false,
        message: 'Place not found',
        credits: 0,
      })
      return
    }

    // Get place data
    const place = await getPlaceByUserPlaceId(userPlaceId)
    if (!place) {
      res.status(404).json({
        success: false,
        message: 'Place not found',
        credits: 0,
      })
      return
    }

    // Get or create enrichment record
    let [existingEnrichment] = await db
      .select({
        id: enrichmentTable.id,
      })
      .from(enrichmentTable)
      .where(eq(enrichmentTable.placeId, place.id))
      .limit(1)

    // Create enrichment record if doesn't exist
    if (!existingEnrichment) {
      const [newEnrichment] = await db
        .insert(enrichmentTable)
        .values({
          placeId: place.id,
          companyStatus: 'queued',
        })
        .returning({ id: enrichmentTable.id })

      existingEnrichment = { id: newEnrichment.id }
    } else {
      // Update existing record to queued
      await db
        .update(enrichmentTable)
        .set({ companyStatus: 'queued' })
        .where(eq(enrichmentTable.id, existingEnrichment.id))
    }

    // Update status and queue
    await setCompanyEnrichmentStatus(
      userPlaceId,
      'queued',
      'Waiting to start',
      0,
    )

    // Enqueue job - service handles idempotency
    await enqueueCompanyEnrichment({
      userPlaceId,
      enrichmentId: existingEnrichment.id,
      placeId: place.id,
      userId,
    })

    logger.info({
      msg: 'Company enrichment job enqueued',
      event: 'company_enrichment_enqueued',
      metadata: {
        userId,
        userPlaceId,
        enrichmentId: existingEnrichment.id,
      },
    })

    res.json({
      success: true,
      message: 'Company enrichment queued',
      enrichmentId: existingEnrichment.id,
      credits: COMPANY_CREDITS,
    })
  } catch (error) {
    logger.error({
      msg: 'Company enrichment request failed',
      event: 'company_enrichment_error',
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        userId: req.auth.userId,
      },
    })

    res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Failed to enqueue company enrichment',
      credits: 0,
    })
  }
}
