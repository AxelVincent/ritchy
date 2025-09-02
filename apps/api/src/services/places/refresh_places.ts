import { logger } from '@ritchy/logger'
import { getPlaceDetailsOptimized } from '../../external/google_maps/place_details_optimized'
import { getPlacesByUserPlaceIds } from './queries/get_places_by_user_place_ids'

interface AggregatePlaceDataOptions {
  userId: string
  listId?: string
  excludeListId?: string
}

/**
 * Shared utility to fetch place details and aggregate data for multiple places
 * Used by both search and list content endpoints
 */
export const refreshPlaces = async (
  userPlaceIds: string[],
  options: AggregatePlaceDataOptions,
): Promise<void> => {
  const { listId } = options
  try {
    const places = await getPlacesByUserPlaceIds(userPlaceIds)

    const placeDetailsResults = []
    const errors = []

    for (const place of places) {
      try {
        const placeDetails = await getPlaceDetailsOptimized(place)
        placeDetailsResults.push(placeDetails)

        logger.debug({
          msg: 'Successfully processed place',
          event: 'place_processed_success',
          metadata: {
            userPlaceId: place.user_place_id,
            fromCache: placeDetails.fromCache,
          },
        })
      } catch (error) {
        logger.warn({
          msg: 'Failed to process individual place, continuing with others',
          event: 'individual_place_failed',
          metadata: {
            userPlaceId: place.user_place_id,
            error: error instanceof Error ? error.message : String(error),
          },
        })

        errors.push({
          userPlaceId: place.user_place_id,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    const placeDetails = placeDetailsResults
      .filter((result) => result.fromCache)
      .map((result) => result)

    logger.info({
      msg: 'Place details retrieval summary',
      event: 'place_details_summary',
      metadata: {
        totalPlaces: places.length,
        totalProcessed: placeDetailsResults.length,
        totalFulfilled: placeDetails.length,
        totalErrors: errors.length,
        placeIds: placeDetails.map((place) => place.id),
        context: listId ? 'list' : 'search',
        errors: errors.length > 0 ? errors : undefined,
      },
    })

    // If all places failed, throw an error
    if (placeDetailsResults.length === 0 && errors.length > 0) {
      throw new Error(
        `All places failed to process: ${errors.map((e) => e.error).join(', ')}`,
      )
    }

    return
  } catch (error) {
    logger.error({
      msg: 'Error refreshing places',
      event: 'refresh_places_error',
      metadata: { error },
    })
    throw error
  }
}
