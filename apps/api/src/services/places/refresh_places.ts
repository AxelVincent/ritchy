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

  const places = await getPlacesByUserPlaceIds(userPlaceIds)

  const placeDetailsResults = []
  for (const place of places) {
    const placeDetails = await getPlaceDetailsOptimized(place)
    placeDetailsResults.push(placeDetails)
  }

  const placeDetails = placeDetailsResults
    .filter((result) => result.fromCache)
    .map((result) => result)

  logger.info({
    msg: 'Place details retrieval summary',
    event: 'place_details_summary',
    metadata: {
      totalPlaces: placeDetailsResults.length,
      totalFulfilled: placeDetails.length,
      placeIds: placeDetails.map((place) => place.id),
      context: listId ? 'list' : 'search',
    },
  })

  return
}
