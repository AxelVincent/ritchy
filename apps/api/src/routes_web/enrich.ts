import { logger } from '@ritchy/logger'
import {
  type EnrichApiResponse,
  type EnrichRequestQuery,
  EnrichRequestSchema,
  type EnrichResponse,
  EnrichResponseSchema,
} from '@ritchy/types'
import type { Request, Response } from 'express'
import { z } from 'zod'

import { db } from '../db/db'
import { enrichment } from '../db/schema'
import { getOrFetchEnrichmentData } from '../services/enrichment/getOrFetchEnrichmentData'

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

    // Get or fetch enrichment data
    const enrichedData = await getOrFetchEnrichmentData(id, website)

    if (!enrichedData) {
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
    res.json(validatedData)
    return
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.info({
        msg: 'Validation error',
        event: 'validation_error',
        metadata: { error },
      })
      res.status(400).json({
        error: 'Invalid request parameters',
        details: error.errors,
      })
      return
    }

    logger.error({
      msg: 'Enrichment error',
      event: 'enrichment_error',
      metadata: { error },
    })
    res.status(500).json({ error: 'Failed to enrich website data' })
    return
  }
}
