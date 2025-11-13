import { desc, eq, inArray, sql } from 'drizzle-orm'
import { db } from '../../../db/db'
import { enrichment, userPlace } from '../../../db/schema'

/**
 * Reorders user place IDs based on their enrichment scores (highest first).
 * Places without enrichment scores maintain their original order at the end.
 *
 * @param userPlaceIds - Array of user place IDs to reorder
 * @returns Reordered array of user place IDs
 */
export const reorderByEnrichmentScore = async (
  userPlaceIds: string[],
): Promise<string[]> => {
  if (userPlaceIds.length === 0) {
    return []
  }

  // Single query with ORDER BY to sort by score (highest first, nulls and zeros last)
  const sortedUserPlaces = await db
    .select({
      userPlaceId: userPlace.id,
    })
    .from(userPlace)
    .leftJoin(enrichment, eq(userPlace.place_id, enrichment.placeId))
    .where(inArray(userPlace.id, userPlaceIds))
    .orderBy(desc(sql`COALESCE(NULLIF(${enrichment.score}, 0), -1)`))

  return sortedUserPlaces.map((item) => item.userPlaceId)
}
