import { logger } from '@ritchy/logger'
import {
  type EnrichApiResponse,
  type EnrichRequestQuery,
  EnrichRequestSchema,
  EnrichResponseSchema,
} from '@ritchy/types'
import type { Request, Response } from 'express'
import { z } from 'zod'

import { db } from '../db/db'
import { enrichment } from '../db/schema'
import { analyzeWebsite } from '../external/website_analyzer'

/**
 * Enriches website data with emails and social media links
 * @param req Express request with website URL
 * @param res Express response
 */
export const enrichWebsite = async (
  req: Request<
    Record<string, never>,
    EnrichApiResponse,
    unknown,
    EnrichRequestQuery
  >,
  res: Response<EnrichApiResponse>,
): Promise<void> => {
  try {
    // Validate query parameters
    const { id, website } = EnrichRequestSchema.parse(req.query)
    const userId = req.auth.userId

    logger.info({
      msg: 'Processing enrichment request',
      event: 'enrichment_request',
      metadata: { userId, placeId: id, website },
    })

    // Get or fetch enrichment data
    // const enrichedData = await getOrFetchEnrichmentData(id, website)
    const enrichedData = await analyzeWebsite({ url: website })

    if (!enrichedData) {
      logger.warn({
        msg: 'Enrichment failed to produce data',
        event: 'enrichment_no_data',
        metadata: { userId, placeId: id, website },
      })

      res.status(500).json({
        error: 'Failed to enrich website',
      })
      return
    }

    // Record that this user has enriched this place
    await db
      .insert(enrichment)
      .values({
        userId,
        placeId: id,
        website,
      })
      .onConflictDoUpdate({
        target: [enrichment.userId, enrichment.placeId],
        set: {
          website,
          updatedAt: new Date(),
        },
      })

    // Validate response
    const validatedData = EnrichResponseSchema.parse(enrichedData)

    logger.info({
      msg: 'Enrichment request completed successfully',
      event: 'enrichment_success',
      metadata: {
        userId,
        placeId: id,
        enrichedData,
      },
    })

    res.json(validatedData)
    return
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.info({
        msg: 'Validation error in enrichment request',
        event: 'enrichment_validation_error',
        metadata: {
          error: error.errors,
          query: req.query,
        },
      })
      res.status(400).json({
        error: 'Invalid request parameters',
        details: error.errors,
      })
      return
    }

    logger.error({
      msg: 'Enrichment request failed',
      event: 'enrichment_error',
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        query: req.query,
      },
    })
    res.status(500).json({ error: 'Failed to enrich website data' })
    return
  }
}
