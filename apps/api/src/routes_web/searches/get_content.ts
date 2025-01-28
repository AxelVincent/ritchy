import { logger } from '@ritchy/logger'
import {
  type GetSearchContentApiResponse,
  type GetSearchContentResponse,
  GetSearchContentResponseSchema,
} from '@ritchy/types'
import { and, eq } from 'drizzle-orm'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { db } from '../../db/db'
import { search } from '../../db/schema'
import { postTextSearchV1 } from '../../external/google_maps/text_search_V1'
import { REDIS_KEYS } from '../../lib/redis/keys'
import { redisClient } from '../../lib/redis/redis'
import { getListAssociationsByPlaceIds } from '../../services/lists/getListAssociationsByPlaceIds'
import { getNotesByPlaceIds } from '../../services/notes/getNotesByPlaceIds'

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

    // Get associations and notes for each place
    const placeIds = results.map((result) => result.id)
    const associations = await getListAssociationsByPlaceIds(placeIds, userId)
    const notes = await getNotesByPlaceIds(placeIds, userId)

    // Map results with associations and notes
    const mappedResults = results.map((result) => ({
      ...result,
      associatedLists: associations.get(result.id),
      notes: notes.get(result.id),
    }))

    // Validate response
    const validatedResults = GetSearchContentResponseSchema.parse(mappedResults)

    logger.info({
      msg: 'Get search content',
      event: 'get_search_content',
      metadata: {
        results: validatedResults.length,
      },
    })
    res.json(validatedResults)
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
    }

    logger.error({
      msg: 'Get search content error',
      event: 'get_search_content_error',
      metadata: { error },
    })
    res.status(500).json({ error: 'Failed to get search content' })
  }
}
