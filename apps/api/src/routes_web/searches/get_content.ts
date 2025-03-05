import { logger } from '@ritchy/logger'
import {
  type GetSearchContentApiResponse,
  type GetSearchContentResponse,
  GetSearchContentResponseSchema,
  PlaceSchema,
} from '@ritchy/types'
import { and, eq } from 'drizzle-orm'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { db } from '../../db/db'
import { search } from '../../db/schema'
import { postTextSearchV1 } from '../../external/google_maps/text_search_V1'
import { REDIS_KEYS } from '../../lib/redis/keys'
import { redisClient } from '../../lib/redis/redis'
import { aggregatePlaceData } from '../../services/places/aggregatePlaceData'

export const getSearchContent = async (
  req: Request<{ id: string }>,
  res: Response<GetSearchContentApiResponse>,
): Promise<void> => {
  try {
    const searchId = req.params.id
    const userId = req.auth.userId

    const [result] = await db
      .select()
      .from(search)
      .where(and(eq(search.id, searchId), eq(search.userId, req.auth.userId)))

    if (!result) {
      res.status(404).json({
        error: 'Search not found',
      })
      return
    }

    const key = REDIS_KEYS.search(searchId)
    let results = await redisClient.get<GetSearchContentResponse>(key)

    if (!results || results.length === 0) {
      logger.info({
        msg: 'No cached search results, fetching from Google Maps and caching',
        event: 'no_cached_search_results',
        metadata: { searchId },
      })
      results = await postTextSearchV1({
        model: result.model,
        textQuery: result.keyword,
        locationBias: {
          circle: {
            radiusInMeters: result.radiusInMeters,
            center: {
              latitude: Number(result.latitude),
              longitude: Number(result.longitude),
            },
          },
        },
      })
      await redisClient.set(key, results)
    }

    // Aggregate data for the search results
    const aggregatedResults = await aggregatePlaceData(results, {
      userId,
      includeEnrichment: true,
    })

    // Validate individual places and collect validation errors
    const validationErrors: Array<{ place: unknown; error: z.ZodError }> = []
    for (const result of aggregatedResults) {
      try {
        PlaceSchema.parse(result)
      } catch (error) {
        if (error instanceof z.ZodError) {
          validationErrors.push({ place: result, error })
        }
      }
    }

    // Log validation errors if any were found
    if (validationErrors.length > 0) {
      logger.warn({
        msg: 'Some places failed schema validation',
        event: 'place_validation_errors',
        metadata: {
          errorCount: validationErrors.length,
          errors: validationErrors.map(({ error, place }) => ({
            placeId:
              typeof place === 'object' && place !== null
                ? (place as { id: string }).id
                : 'unknown',
            errors: error.errors.map((e) => ({
              path: e.path.join('.'),
              message: e.message,
              code: e.code,
            })),
          })),
        },
      })
    }

    logger.info({
      msg: 'Get search content',
      event: 'get_search_content',
      metadata: {
        results: aggregatedResults.length,
      },
    })
    res.json(aggregatedResults)
    return
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.info({
        msg: 'Validation error',
        event: 'validation_error',
        metadata: { error },
      })
      res.status(400).json({
        error: 'Invalid request data',
        details: error.errors,
      })
      return
    }

    logger.error({
      msg: 'Get search content error',
      event: 'get_search_content_error',
      metadata: { error },
    })
    res.status(500).json({ error: 'Failed to get search content' })
    return
  }
}
