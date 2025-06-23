import { logger } from '@ritchy/logger'
import type { Place, PlaceBase } from '@ritchy/types'
import { PlaceSchema } from '@ritchy/types'
import { z } from 'zod'
import { getPlaceDetailsOptimized } from '../../external/google_maps/place_details_optimized'
import { aggregatePlaceData } from './aggregate_place_data'

interface PlaceWithSearchId {
  placeId: string
  searchId: string | null
}

interface AggregatePlaceDataOptions {
  userId: string
  listId?: string
  excludeListId?: string
  includeEnrichment?: boolean
}

interface GetPlacesWithDetailsResult {
  places: Place[]
  cacheHits: number
  cacheMisses: number
  errors: number
  validationErrors: Array<{ place: unknown; error: z.ZodError }>
}

/**
 * Shared utility to fetch place details and aggregate data for multiple places
 * Used by both search and list content endpoints
 */
export const getPlacesWithDetails = async (
  placesWithSearchIds: PlaceWithSearchId[],
  options: AggregatePlaceDataOptions,
): Promise<GetPlacesWithDetailsResult> => {
  const { userId, listId, excludeListId, includeEnrichment = false } = options

  // Get place details with rate limiting and optimization
  const placeDetailsResults = await Promise.allSettled(
    placesWithSearchIds.map(async ({ placeId, searchId }) =>
      getPlaceDetailsOptimized(placeId, searchId),
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
      totalPlaces: placesWithSearchIds.length,
      cacheHits,
      cacheMisses,
      errors,
      context: listId ? 'list' : 'search',
    },
  })

  // Create a map of placeId to searchId for easy lookup
  const placeSearchMap = new Map(
    placesWithSearchIds.map(({ placeId, searchId }) => [placeId, searchId]),
  )

  const placeDetails = placeDetailsResults
    .filter(
      (
        result,
      ): result is PromiseFulfilledResult<PlaceBase & { fromCache: boolean }> =>
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
    excludeListId,
    includeEnrichment,
    listId,
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

  return {
    places: aggregatedPlaceDetails,
    cacheHits,
    cacheMisses,
    errors,
    validationErrors,
  }
}
