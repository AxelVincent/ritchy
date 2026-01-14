import { logger } from '@ritchy/logger'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { db } from '../../../db/db'
import { search } from '../../../db/schema'
import { enqueueBulkCompanyEnrichment } from '../../../internal/bullmq/jobs/enrichment-company/queue'
import { COMPANY_CREDITS } from '../../../services/enrichment/shared/config/constants'
import { getEnrichmentsByPlaceIds } from '../../../services/enrichment/shared/queries/get_enrichments_by_place_ids'
import { upsertEnrichmentsBatch } from '../../../services/enrichment/shared/queries/upsert_enrichments_batch'
import { setBatchCompanyEnrichmentStatus } from '../../../services/enrichment/shared/status/status_manager'
import { consumeCredits } from '../../../services/payment/queries/consume_credits'
import { getUserCredits } from '../../../services/payment/queries/get_user_credits'
import { refundCredits } from '../../../services/payment/queries/refund_credits'
import { getPlacesByUserPlaceIds } from '../../../services/places/queries/get_places_by_user_place_ids'
import { populateSearchPlacesIfEmpty } from '../../../services/searches/populate-search-places'
import type { CreateSearchApiResponse, CreateSearchRequest } from './contract'
import {
  CreateSearchRequestSchema,
  SEARCH_LIMIT,
  getMinimumRequiredModel,
} from './contract'

export const createSearchHandler = async (
  req: Request<
    Record<string, never>,
    CreateSearchApiResponse,
    CreateSearchRequest
  >,
  res: Response<CreateSearchApiResponse>,
): Promise<void> => {
  logger.info({
    msg: 'Search creation initiated',
    event: 'search_creation_started',
    metadata: {
      requestBody: req.body,
    },
  })

  try {
    const parsedBody = CreateSearchRequestSchema.parse(req.body)
    const userId = req.auth.userId

    logger.info({
      msg: 'Search request validated',
      event: 'search_validation_passed',
      metadata: {
        requestedModel: parsedBody.model,
        autoEnrich: parsedBody.autoEnrich,
      },
    })

    // Determine the effective limit and model
    // If limit is provided, use it; otherwise fall back to model-based defaults
    const effectiveLimit =
      parsedBody.limit ?? (parsedBody.model === 'BASIC' ? 60 : 240)

    // Derive the optimal model based on the limit
    const effectiveModel = getMinimumRequiredModel(effectiveLimit)

    // If autoEnrich, check credits upfront using the exact limit
    if (parsedBody.autoEnrich) {
      const requiredCredits = effectiveLimit * COMPANY_CREDITS
      const userCredits = await getUserCredits(userId)

      if (userCredits < requiredCredits) {
        logger.info({
          msg: 'Insufficient credits for auto-enrich',
          event: 'auto_enrich_insufficient_credits',
          metadata: {
            userId,
            required: requiredCredits,
            available: userCredits,
            limit: effectiveLimit,
          },
        })
        res.status(400).json({
          error: 'INSUFFICIENT_CREDITS',
          message: `Auto-enrich requires ${requiredCredits} credits, you have ${userCredits}`,
        })
        return
      }
    }

    const [result] = await db
      .insert(search)
      .values({
        userId,
        placeName: parsedBody.placeName,
        keyword: parsedBody.keyword,
        model: effectiveModel,
        limit: effectiveLimit,
        rectangle: parsedBody.rectangle,
      })
      .returning({
        id: search.id,
      })

    logger.info({
      msg: 'Search created successfully',
      event: 'search_created',
      metadata: {
        searchId: result.id,
        requestedModel: parsedBody.model,
        rectangle: parsedBody.rectangle,
      },
    })

    // If autoEnrich, populate places immediately and enqueue enrichment jobs
    if (parsedBody.autoEnrich) {
      const { userPlaceIds } = await populateSearchPlacesIfEmpty(
        result.id,
        userId,
      )

      if (userPlaceIds.length > 0) {
        // Step 1: Batch fetch all places
        const places = await getPlacesByUserPlaceIds(userPlaceIds)
        const userPlaceIdToPlaceId = new Map(
          places.map((p) => [p.user_place_id, p.id]),
        )

        // Step 2: Get unique placeIds
        const placeIds = [...new Set(places.map((p) => p.id))]

        // Step 3: Batch fetch existing enrichments
        const existingEnrichments = await getEnrichmentsByPlaceIds(placeIds)
        const enrichmentByPlaceId = new Map(
          existingEnrichments.map((e) => [e.placeId, e]),
        )

        // Step 4: Filter eligible places
        const eligiblePlaces: Array<{ userPlaceId: string; placeId: string }> =
          []

        for (const userPlaceId of userPlaceIds) {
          const placeId = userPlaceIdToPlaceId.get(userPlaceId)
          if (!placeId) continue

          const enrichment = enrichmentByPlaceId.get(placeId)
          if (
            enrichment?.companyStatus === 'completed' ||
            enrichment?.companyStatus === 'queued' ||
            enrichment?.companyStatus === 'processing'
          ) {
            continue
          }

          eligiblePlaces.push({ userPlaceId, placeId })
        }

        if (eligiblePlaces.length > 0) {
          const totalCredits = eligiblePlaces.length * COMPANY_CREDITS

          // Step 5: Consume credits (optimistic)
          await consumeCredits(userId, totalCredits)

          try {
            // Step 6: Batch upsert enrichment records
            const eligiblePlaceIds = eligiblePlaces.map((p) => p.placeId)
            const upsertedEnrichments =
              await upsertEnrichmentsBatch(eligiblePlaceIds)
            const enrichmentIdByPlaceId = new Map(
              upsertedEnrichments.map((e) => [e.placeId, e.id]),
            )

            // Step 7: Batch set Redis status
            await setBatchCompanyEnrichmentStatus(
              eligiblePlaces.map(({ userPlaceId }) => ({
                userPlaceId,
                status: 'queued',
                step: 'Queued for enrichment',
                progress: 0,
              })),
            )

            // Step 8: Batch enqueue jobs
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

            await enqueueBulkCompanyEnrichment(jobData)
          } catch (error) {
            // Compensate: refund credits on failure
            logger.error({
              msg: 'Failed to enqueue enrichment jobs, refunding credits',
              event: 'auto_enrich_enqueue_failure',
              metadata: {
                userId,
                creditsToRefund: totalCredits,
                error: error instanceof Error ? error.message : String(error),
              },
            })

            await refundCredits(userId, totalCredits)
            throw error
          }
        }

        const alreadyEnrichedCount = userPlaceIds.length - eligiblePlaces.length

        logger.info({
          msg: 'Auto-enrich jobs enqueued',
          event: 'auto_enrich_enqueued',
          metadata: {
            searchId: result.id,
            enqueuedCount: eligiblePlaces.length,
            alreadyEnrichedCount,
            totalPlaces: userPlaceIds.length,
          },
        })

        res.json({
          id: result.id,
          autoEnrichStarted: eligiblePlaces.length > 0,
          enqueuedCount: eligiblePlaces.length,
          userPlaceIds,
        })
        return
      }
    }

    res.json({
      id: result.id,
    })
    return
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.info({
        msg: 'Search validation error',
        event: 'search_validation_error',
        metadata: {
          validationErrors: error.errors,
          requestBody: req.body,
        },
      })
      res.status(400).json({
        error: 'Invalid request data',
        message: 'Invalid request data',
      })
      return
    }

    logger.error({
      msg: 'Search creation failed',
      event: 'search_creation_error',
      metadata: {
        error:
          error instanceof Error
            ? {
                message: error.message,
                name: error.name,
                stack: error.stack,
              }
            : error,
        requestBody: req.body,
      },
    })
    res.status(500).json({
      error: 'Failed to create search',
      message: 'Failed to create search',
    })
    return
  }
}
