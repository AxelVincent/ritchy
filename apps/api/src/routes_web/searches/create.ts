import { logger } from '@ritchy/logger'
import {
  type CreateSearchApiResponse,
  type CreateSearchRequestBody,
  CreateSearchRequestBodySchema,
} from '@ritchy/types'
import { eq } from 'drizzle-orm'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { db } from '../../db/db'
import { enrichment as enrichmentTable, search } from '../../db/schema'
import { enqueueCompanyEnrichment } from '../../internal/bullmq/jobs/enrichment-company/queue'
import { COMPANY_CREDITS } from '../../services/enrichment/constants'
import { setCompanyEnrichmentStatus } from '../../services/enrichment/status_manager'
import { consumeCredits } from '../../services/payment/queries/consume_credits'
import { getUserCredits } from '../../services/payment/queries/get_user_credits'
import { getPlaceByUserPlaceId } from '../../services/places/queries/get_place_by_user_place_id'
import { populateSearchPlacesIfEmpty } from '../../services/searches/populate-search-places'

export const createSearch = async (
  req: Request<
    Record<string, never>,
    CreateSearchApiResponse,
    CreateSearchRequestBody
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
    const parsedBody = CreateSearchRequestBodySchema.parse(req.body)
    const userId = req.auth.userId

    logger.info({
      msg: 'Search request validated',
      event: 'search_validation_passed',
      metadata: {
        requestedModel: parsedBody.model,
        autoEnrich: parsedBody.autoEnrich,
      },
    })

    // If autoEnrich, check credits upfront
    if (parsedBody.autoEnrich) {
      const expectedResults = parsedBody.model === 'BASIC' ? 60 : 240
      const requiredCredits = expectedResults * COMPANY_CREDITS
      const userCredits = await getUserCredits(userId)

      if (userCredits < requiredCredits) {
        logger.info({
          msg: 'Insufficient credits for auto-enrich',
          event: 'auto_enrich_insufficient_credits',
          metadata: {
            userId,
            required: requiredCredits,
            available: userCredits,
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
        model: parsedBody.model,
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
        {
          model: parsedBody.model,
          keyword: parsedBody.keyword,
          rectangle: parsedBody.rectangle,
        },
      )

      if (userPlaceIds.length > 0) {
        // First pass: determine which places need enrichment
        const placesToEnrich: Array<{
          userPlaceId: string
          placeId: string
          enrichmentId: string
        }> = []

        for (const userPlaceId of userPlaceIds) {
          const place = await getPlaceByUserPlaceId(userPlaceId)
          if (!place) continue

          // Check existing enrichment status
          const [existingEnrichment] = await db
            .select({
              id: enrichmentTable.id,
              companyStatus: enrichmentTable.companyStatus,
            })
            .from(enrichmentTable)
            .where(eq(enrichmentTable.placeId, place.id))
            .limit(1)

          // Skip if already enriched or in progress
          if (
            existingEnrichment?.companyStatus === 'completed' ||
            existingEnrichment?.companyStatus === 'queued' ||
            existingEnrichment?.companyStatus === 'processing'
          ) {
            continue
          }

          // Create enrichment record if doesn't exist
          let enrichmentId: string
          if (!existingEnrichment) {
            const [newEnrichment] = await db
              .insert(enrichmentTable)
              .values({
                placeId: place.id,
                companyStatus: 'queued',
              })
              .returning({ id: enrichmentTable.id })
            enrichmentId = newEnrichment.id
          } else {
            // Update existing record to queued
            await db
              .update(enrichmentTable)
              .set({ companyStatus: 'queued' })
              .where(eq(enrichmentTable.id, existingEnrichment.id))
            enrichmentId = existingEnrichment.id
          }

          placesToEnrich.push({
            userPlaceId,
            placeId: place.id,
            enrichmentId,
          })
        }

        // Only charge for places that will actually be enriched
        if (placesToEnrich.length > 0) {
          await consumeCredits(userId, placesToEnrich.length * COMPANY_CREDITS)

          // Enqueue enrichment jobs
          for (const { userPlaceId, placeId, enrichmentId } of placesToEnrich) {
            await setCompanyEnrichmentStatus(
              userPlaceId,
              'queued',
              'Queued for enrichment',
              0,
            )

            await enqueueCompanyEnrichment({
              userPlaceId,
              enrichmentId,
              placeId,
              userId,
            })
          }
        }

        const alreadyEnrichedCount = userPlaceIds.length - placesToEnrich.length

        logger.info({
          msg: 'Auto-enrich jobs enqueued',
          event: 'auto_enrich_enqueued',
          metadata: {
            searchId: result.id,
            enqueuedCount: placesToEnrich.length,
            alreadyEnrichedCount,
            totalPlaces: userPlaceIds.length,
          },
        })

        res.json({
          id: result.id,
          autoEnrichStarted: placesToEnrich.length > 0,
          enqueuedCount: placesToEnrich.length,
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
