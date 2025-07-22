import { logger } from '@ritchy/logger'
import type { GetSearchContentApiResponse } from '@ritchy/types'
import { and, eq, sql } from 'drizzle-orm'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { db } from '../../db/db'
import { place, search, searchPlace, userPlace } from '../../db/schema'
import { postTextSearchV1 } from '../../external/google_maps/text_search_V1'
import { REDIS_KEYS } from '../../external/redis/keys'
import { createRedisClient, redisClient } from '../../external/redis/redis'
import { getPlacesWithDetails } from '../../services/places/get_places_with_details'

export const getSearchContent = async (
  req: Request<{ id: string }>,
  res: Response<GetSearchContentApiResponse>
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
        error: 'Search not found'
      })
      return
    }

    const searchPlaces = await db
      .select()
      .from(searchPlace)
      .where(and(eq(searchPlace.searchId, searchId)))

    if (!searchPlaces || searchPlaces.length === 0) {
      logger.info({
        msg: 'No cached search results, fetching from Google Maps and caching',
        event: 'no_cached_search_results',
        metadata: {
          searchId,
          userId,
          model: result.model,
          keyword: result.keyword,
          rectangle: result.rectangle
        }
      })
      const freshResults = await postTextSearchV1({
        model: result.model,
        textQuery: result.keyword,
        rectangle: result.rectangle
      })

      const places = await db
        .insert(place)
        .values(
          freshResults.map((place) => ({
            source: 'google' as const,
            sourceId: place.sourceId
          }))
        )
        .returning({ id: place.id })
        .onConflictDoUpdate({
          target: place.sourceId,
          set: {
            source: sql`excluded.source`,
            sourceId: sql`excluded.source_id`
          }
        })
      logger.info({
        msg: 'Places inserted',
        event: 'places_inserted',
        metadata: {
          places: places.length
        }
      })
      const userPlaces = await db
        .insert(userPlace)
        .values(
          places.map((place) => ({
            userId,
            placeId: place.id
          }))
        )
        .returning({ id: userPlace.id })
        .onConflictDoUpdate({
          target: [userPlace.userId, userPlace.placeId],
          set: {
            placeId: sql`excluded.place_id`,
            userId: sql`excluded.user_id`
          }
        })

      logger.info({
        msg: 'User places inserted',
        event: 'user_places_inserted',
        metadata: {
          userPlaces: userPlaces.length
        }
      })
      await db.insert(searchPlace).values(
        userPlaces.map((userPlace) => ({
          searchId,
          userPlaceId: userPlace.id
        }))
      )
    }

    const cachedResults = await db
      .select()
      .from(searchPlace)
      .innerJoin(userPlace, eq(searchPlace.userPlaceId, userPlace.id))
      .where(eq(searchPlace.searchId, searchId))

    if (!cachedResults || cachedResults.length === 0) {
      logger.error({
        msg: 'No cached results found after fetch',
        event: 'no_cached_results_found',
        metadata: {
          searchId,
          userId,
          retryAttempt: 'second_attempt_after_fetch',
          searchModel: result.model,
          searchKeyword: result.keyword
        }
      })
      res.status(500).json({ error: 'Failed to get search content' })
      return
    }

    // Convert place IDs to the format expected by the shared utility
    const userPlaceIds = cachedResults.map((result) => result.user_place.id)

    // Use shared utility to get place details and aggregate data
    const { places: aggregatedResults } = await getPlacesWithDetails(
      userPlaceIds,
      {
        userId,
        includeEnrichment: true
      }
    )

    logger.info({
      msg: 'Get search content',
      event: 'get_search_content',
      metadata: {
        results: aggregatedResults.length
      }
    })
    res.json(aggregatedResults)
    return
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.info({
        msg: 'Validation error',
        event: 'validation_error',
        metadata: { error }
      })
      res.status(400).json({
        error: 'Invalid request data',
        details: error.errors
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
        errorKeys: error ? Object.keys(error) : []
      }
    })
    res.status(500).json({ error: 'Failed to get search content' })
    return
  }
}
