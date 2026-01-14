import { logger } from '@ritchy/logger'
import { eq, sql } from 'drizzle-orm'
import { db } from '../../db/db'
import { place, search, searchPlace, userPlace } from '../../db/schema'
import { postTextSearchV1 } from '../../external/google_maps/text_search_V1'
import { reorderByEnrichmentScore } from '../places/utils/reorder_by_enrichment_score'

export interface PopulateSearchResult {
  populated: boolean
  userPlaceIds: string[]
}

/**
 * Populates search places if the search has no associated places.
 * Reads search config (model, keyword, rectangle, limit) from the database.
 * Fetches from Google Maps API, creates places, user_places, and search_places.
 *
 * @returns object with populated flag and userPlaceIds array
 */
export const populateSearchPlacesIfEmpty = async (
  searchId: string,
  userId: string,
): Promise<PopulateSearchResult> => {
  // Check if search already has places
  const existingPlaces = await db
    .select()
    .from(searchPlace)
    .where(eq(searchPlace.searchId, searchId))
    .limit(1)

  if (existingPlaces.length > 0) {
    return { populated: false, userPlaceIds: [] }
  }

  // Read search config from database (single source of truth)
  const searchResult = await db
    .select({
      model: search.model,
      keyword: search.keyword,
      rectangle: search.rectangle,
      limit: search.limit,
    })
    .from(search)
    .where(eq(search.id, searchId))
    .limit(1)

  if (searchResult.length === 0) {
    logger.error({
      msg: 'Search not found for population',
      event: 'search_not_found',
      metadata: { searchId, userId },
    })
    return { populated: false, userPlaceIds: [] }
  }

  const searchConfig = searchResult[0]

  logger.info({
    msg: 'No cached search results, fetching from Google Maps and caching',
    event: 'populating_search_places',
    metadata: {
      searchId,
      userId,
      model: searchConfig.model,
      keyword: searchConfig.keyword,
      limit: searchConfig.limit,
    },
  })

  // Fetch fresh results from Google Maps
  const freshResults = await postTextSearchV1({
    model: searchConfig.model,
    textQuery: searchConfig.keyword,
    rectangle: searchConfig.rectangle,
  })

  if (!freshResults || freshResults.length === 0) {
    logger.info({
      msg: 'No places found from Google Maps search',
      event: 'no_places_from_google',
      metadata: { searchId, userId },
    })
    return { populated: false, userPlaceIds: [] }
  }

  // Trim results to the stored limit
  const trimmedResults = freshResults.slice(0, searchConfig.limit)

  logger.info({
    msg: 'Results trimmed to limit',
    event: 'search_results_trimmed',
    metadata: {
      searchId,
      originalCount: freshResults.length,
      limit: searchConfig.limit,
      trimmedCount: trimmedResults.length,
    },
  })

  // Insert places (upsert on conflict)
  const places = await db
    .insert(place)
    .values(
      trimmedResults.map((p) => ({
        source: 'google' as const,
        source_id: p.sourceId,
      })),
    )
    .returning({ id: place.id })
    .onConflictDoUpdate({
      target: place.source_id,
      set: {
        source: sql`excluded.source`,
        source_id: sql`excluded.source_id`,
      },
    })

  logger.info({
    msg: 'Places inserted for search',
    event: 'search_places_inserted',
    metadata: { searchId, placeCount: places.length },
  })

  // Create user_place records
  const userPlaces = await db
    .insert(userPlace)
    .values(
      places.map((p) => ({
        user_id: userId,
        place_id: p.id,
      })),
    )
    .returning({ id: userPlace.id })
    .onConflictDoUpdate({
      target: [userPlace.user_id, userPlace.place_id],
      set: {
        place_id: sql`excluded.place_id`,
        user_id: sql`excluded.user_id`,
      },
    })

  logger.info({
    msg: 'User places created for search',
    event: 'search_user_places_created',
    metadata: { searchId, userPlaceCount: userPlaces.length },
  })

  // Reorder by enrichment score (highest first)
  const userPlaceIds = userPlaces.map((up) => up.id)
  const reorderedUserPlaceIds = await reorderByEnrichmentScore(userPlaceIds)

  // Insert search_place records with incremental timestamps to preserve order
  // Since we sort by created_at DESC, highest score (first in array) needs LATEST timestamp
  // We reverse the offset so index 0 gets the highest timestamp
  const baseTime = new Date()
  const totalItems = reorderedUserPlaceIds.length
  await db.insert(searchPlace).values(
    reorderedUserPlaceIds.map((userPlaceId, index) => ({
      searchId,
      userPlaceId,
      createdAt: new Date(baseTime.getTime() + (totalItems - 1 - index)), // Highest score gets latest timestamp
      updatedAt: baseTime,
    })),
  )

  logger.info({
    msg: 'Search places populated successfully',
    event: 'search_places_populated',
    metadata: { searchId, placeCount: reorderedUserPlaceIds.length },
  })

  return { populated: true, userPlaceIds: reorderedUserPlaceIds }
}
