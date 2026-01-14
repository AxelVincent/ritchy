import { logger } from '@ritchy/logger'
import type { Place as PlaceApi } from '../../../shared'
import { refreshPlaces } from '../refresh_places'

export interface CacheMissHandlerOptions {
  userId: string
  listId?: string
  searchId?: string
}

/**
 * Detects places with missing source URLs (cache misses) and refreshes them.
 * Returns true if any places were refreshed and data should be re-fetched.
 */
export const handleCacheMisses = async (
  items: PlaceApi[],
  options: CacheMissHandlerOptions,
): Promise<boolean> => {
  const { userId, listId, searchId } = options

  // Find places without source URL that aren't deleted
  const cacheMisses = items
    .filter((place) => !place.isDeleted)
    .filter((place) => place.sourceUrl === null || place.sourceUrl === '')

  if (cacheMisses.length === 0) {
    return false
  }

  logger.info({
    msg: 'Places are not complete, fetching missing places',
    event: 'places_cache_miss',
    metadata: {
      listId,
      searchId,
      places: cacheMisses.map((place) => place.id),
      cacheMissCount: cacheMisses.length,
    },
  })

  // Refresh missing place data
  await refreshPlaces(
    cacheMisses.map((place) => place.id),
    {
      userId,
      listId,
      excludeListId: listId,
    },
  )

  return true
}
