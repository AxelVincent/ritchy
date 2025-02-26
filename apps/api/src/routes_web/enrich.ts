import { logger } from '@ritchy/logger'
import { type EnrichApiResponse, EnrichResponseSchema } from '@ritchy/types'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { scrapeFromOptimizedUrls } from '../services/scraperEmailsAndSocials'

// Request validation schema
const EnrichRequestSchema = z.object({
  website: z.string().url(),
})

type EnrichRequestQuery = z.infer<typeof EnrichRequestSchema>

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
    const { website } = EnrichRequestSchema.parse(req.query)

    // Call the scraper service
    const enrichedData = await scrapeFromOptimizedUrls(website, 5)

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
