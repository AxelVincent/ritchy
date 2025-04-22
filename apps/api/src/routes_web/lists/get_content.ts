import { logger } from '@ritchy/logger'
import {
  type ListContentApiResponse,
  type Place,
  PlaceSchema,
} from '@ritchy/types'
import { and, eq } from 'drizzle-orm'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { db } from '../../db/db'
import { list, listPlace } from '../../db/schema'
import { getPlaceDetailsOptimized } from '../../external/google_maps/place_details_optimized'
import { aggregatePlaceData } from '../../services/places/aggregatePlaceData'

export const getListContent = async (
  req: Request<{ id: string }>,
  res: Response<ListContentApiResponse>,
): Promise<void> => {
  try {
    const listId = req.params.id
    const userId = req.auth.userId

    // Verify list ownership
    const result = await db
      .select()
      .from(list)
      .where(and(eq(list.id, listId), eq(list.userId, userId)))
      .limit(1)

    if (!result.length) {
      res.status(404).json({
        error: 'List not found',
      })
      return
    }

    // Get all place IDs in the list with their searchId
    const places = await db
      .select({
        id: listPlace.id,
        placeId: listPlace.placeId,
        searchId: listPlace.searchId,
      })
      .from(listPlace)
      .where(eq(listPlace.listId, listId))

    // Create a map of placeId to searchId for easy lookup
    const placeSearchMap = new Map(
      places.map((place) => [place.placeId, place.searchId || null]),
    )

    // Get place details with rate limiting and optimization
    const placeDetailsResults = await Promise.allSettled(
      places.map(async (place) =>
        getPlaceDetailsOptimized(place.placeId, place.searchId || null),
      ),
    )

    // Analyze results
    const cacheHits = placeDetailsResults.filter(
      (result) => result.status === 'fulfilled' && result.value.fromCache,
    ).length
    const cacheMisses = placeDetailsResults.filter(
      (result) => result.status === 'fulfilled' && !result.value.fromCache,
    ).length
    const errors = placeDetailsResults.filter(
      (result) => result.status === 'rejected',
    ).length

    logger.info({
      msg: 'Place details retrieval summary',
      event: 'place_details_summary',
      metadata: {
        totalPlaces: places.length,
        cacheHits,
        cacheMisses,
        errors,
        listId,
      },
    })

    const placeDetails = placeDetailsResults
      .filter(
        (
          result,
        ): result is PromiseFulfilledResult<Place & { fromCache: boolean }> =>
          result.status === 'fulfilled',
      )
      .map((result) => {
        const { fromCache, ...place } = result.value
        // Add searchId to the place data
        return {
          ...place,
          searchId: placeSearchMap.get(place.id) || null,
        }
      })

    // Aggregate data for the place details
    const aggregatedPlaceDetails = await aggregatePlaceData(placeDetails, {
      userId,
      excludeListId: listId,
      includeEnrichment: true,
    })

    // Validate individual places and collect validation errors
    const validationErrors: Array<{ place: unknown; error: z.ZodError }> = []
    for (const result of aggregatedPlaceDetails) {
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

    res.json({
      id: String(result[0].id),
      name: result[0].name,
      emoji: result[0].emoji,
      items: aggregatedPlaceDetails,
      createdAt: result[0].createdAt.toISOString(),
      updatedAt: result[0].updatedAt.toISOString(),
    })
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
        message: 'Invalid request data',
        details: error.errors,
      })
      return
    }

    logger.error({
      msg: 'Get list content error',
      event: 'get_list_content_error',
      metadata: { error },
    })
    res.status(500).json({
      error: 'Failed to get list content',
      message: 'Failed to get list content',
    })
    return
  }
}
