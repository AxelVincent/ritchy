import { logger } from '@ritchy/logger'
import type { FilterCondition, Place, PlaceBase } from '@ritchy/types'
import { PlaceSchema } from '@ritchy/types'
import { z } from 'zod'
import { aggregatePlaceData } from './aggregate_place_data'
import { getPlaces } from './get_places'

interface PlaceWithSearchId {
  placeId: string
  searchId: string | null
}

interface AggregatePlaceDataOptions {
  userId: string
  listId?: string
  excludeListId?: string
  includeEnrichment?: boolean
  redisFilters?: FilterCondition
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
 * Uses the optimized batch flow: check existence -> refresh missing -> get all -> map
 */
export const getAggregatedPlaces = async (
  placesWithSearchIds: PlaceWithSearchId[],
  options: AggregatePlaceDataOptions,
): Promise<GetPlacesWithDetailsResult> => {
  const {
    userId,
    listId,
    excludeListId,
    includeEnrichment = false,
    redisFilters,
  } = options

  // Use the new optimized batch approach with search ID optimization and Redis filtering
  const placeDetailsResults = await getPlaces(placesWithSearchIds, redisFilters)

  // Analyze results
  const cacheHits = placeDetailsResults.length
  const cacheMisses = 0

  logger.info({
    msg: 'Place details retrieval summary',
    event: 'place_details_summary',
    metadata: {
      totalPlaces: placesWithSearchIds.length,
      cacheHits,
      cacheMisses,
      context: listId ? 'list' : 'search',
      hasRedisFilters: !!redisFilters,
    },
  })

  // Create a map of placeId to searchId for easy lookup
  const placeSearchMap = new Map(
    placesWithSearchIds.map(({ placeId, searchId }) => [placeId, searchId]),
  )

  const placeDetails = placeDetailsResults.map((place) => {
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
    errors: 0, // No individual errors with batch approach
    validationErrors,
  }
}
