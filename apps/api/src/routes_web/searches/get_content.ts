import { logger } from '@ritchy/logger'
import type { GetSearchContentApiResponse } from '@ritchy/types'
import { and, eq } from 'drizzle-orm'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { db } from '../../db/db'
import { search } from '../../db/schema'
import { postTextSearchV1 } from '../../external/google_maps/text_search_V1'
import { REDIS_KEYS } from '../../lib/redis/keys'
import { redisClient } from '../../lib/redis/redis'
import { getPlacesWithDetails } from '../../services/places/getPlacesWithDetails'

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
    let cachedResults = await redisClient.get<string[]>(key)

    if (
      !cachedResults ||
      !cachedResults.data ||
      cachedResults.data.length === 0
    ) {
      logger.info({
        msg: 'No cached search results, fetching from Google Maps and caching',
        event: 'no_cached_search_results',
        metadata: {
          searchId,
          userId,
          model: result.model,
          keyword: result.keyword,
          rectangle: result.rectangle,
        },
      })
      const freshResults = await postTextSearchV1({
        model: result.model,
        textQuery: result.keyword,
        rectangle: result.rectangle,
      })

      // Store only the place IDs in the search cache
      const placeIds = freshResults.map((place) => place.id)
      await redisClient.set(key, placeIds)
    }

    cachedResults = await redisClient.get<string[]>(key)
    if (!cachedResults || !cachedResults.data) {
      logger.error({
        msg: 'No cached results found after fetch',
        event: 'no_cached_results_found',
        metadata: { searchId },
      })
      res.status(500).json({ error: 'Failed to get search content' })
      return
    }

    // Convert place IDs to the format expected by the shared utility
    const placesWithSearchIds = cachedResults.data.map((placeId) => ({
      placeId,
      searchId,
    }))

    // Use shared utility to get place details and aggregate data
    const { places: aggregatedResults } = await getPlacesWithDetails(
      placesWithSearchIds,
      {
        userId,
        includeEnrichment: true,
      },
    )

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
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        searchId: req.params.id,
        userId: req.auth.userId,
        errorType: error?.constructor?.name,
        errorKeys: error ? Object.keys(error) : [],
      },
    })
    res.status(500).json({ error: 'Failed to get search content' })
    return
  }
}
