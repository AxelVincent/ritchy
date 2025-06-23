import { logger } from '@ritchy/logger'
import {
  type EnrichApiResponse,
  type EnrichRequestQuery,
  EnrichRequestSchema,
  EnrichResponseSchema,
} from '@ritchy/types'
import { and, eq } from 'drizzle-orm'
import type { Request, Response } from 'express'
import { z } from 'zod'

import { db } from '../db/db'
import { contact } from '../db/schema'
import { createVersionedDbFromRequest } from '../db/versioned_db/client'
import { getOrFetchEnrichmentData } from '../services/enrichment/getOrFetchEnrichmentData'
import { saveEnrichmentData } from '../services/enrichment/saveEnrichmentData'

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

    const versionedDb = createVersionedDbFromRequest(req)
    await versionedDb.upsert(
      'enrichment',
      {
        userId,
        placeId: id,
        website,
      },
      ['userId', 'placeId'],
    )

    // Save enrichment data to PostgreSQL for contact metadata
    try {
      // Get existing contact for this place and user
      const [existingContact] = await db
        .select()
        .from(contact)
        .where(and(eq(contact.placeId, id), eq(contact.userId, userId)))

      if (existingContact) {
        await saveEnrichmentData({
          contactId: existingContact.id,
          enrichmentData: enrichedData,
          source: 'enrichment',
        })

        logger.info({
          msg: 'Enrichment data saved to database',
          event: 'enrichment_data_saved',
          metadata: {
            userId,
            placeId: id,
            contactId: existingContact.id,
            stats: {
              emailsFound: enrichedData.emails.length,
              socialPlatformsFound: Object.keys(enrichedData.socialLinks)
                .length,
            },
          },
        })
      } else {
        logger.warn({
          msg: 'No contact found for enrichment',
          event: 'enrichment_no_contact',
          metadata: { userId, placeId: id },
        })
        // Don't fail the request - user still gets enrichment results
      }
    } catch (saveError) {
      logger.error({
        msg: 'Failed to save enrichment data to database',
        event: 'enrichment_save_error',
        metadata: {
          userId,
          placeId: id,
          error:
            saveError instanceof Error ? saveError.message : String(saveError),
        },
      })
      // Don't fail the entire request if database save fails
      // User still gets the enrichment results from cache
    }

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
