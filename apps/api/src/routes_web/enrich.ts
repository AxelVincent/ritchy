import { logger } from '@ritchy/logger'
import {
  type EnrichApiResponse,
  type EnrichRequestQuery,
  EnrichRequestSchema,
  EnrichResponseSchema,
} from '@ritchy/types'
import type { Request, Response } from 'express'
import { z } from 'zod'

import { createVersionedDb } from '../db/client'
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

    logger.info({
      msg: 'Processing enrichment request',
      event: 'enrichment_request',
      metadata: { userId, placeId: id, website },
    })

    // Get or fetch enrichment data
    const enrichedData = await getOrFetchEnrichmentData(id, website)

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

    const versionedDb = createVersionedDb(req)
    await versionedDb.upsert(
      'enrichment',
      {
        userId,
        placeId: id,
        website,
      },
      ['userId', 'placeId'],
    )

    // Validate response
    const validatedData = EnrichResponseSchema.parse(enrichedData)

    logger.info({
      msg: 'Enrichment request completed successfully',
      event: 'enrichment_success',
      metadata: {
        userId,
        placeId: id,
        stats: {
          emailsFound: enrichedData.emails.length,
          socialPlatformsFound: Object.keys(enrichedData.socialLinks).length,
        },
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
