import { eq } from 'drizzle-orm'
import { db } from '../../db/db'
import { enrichment as enrichmentTable } from '../../db/schema'

export const getUserEnrichedPlaces = async (
  userId: string,
): Promise<Map<string, string>> => {
  const enrichments = await db
    .select({
      placeId: enrichmentTable.placeId,
      website: enrichmentTable.website,
    })
    .from(enrichmentTable)
    .where(eq(enrichmentTable.userId, userId))

  // Create a map of placeId -> website
  const placeToWebsite = new Map<string, string>()
  for (const enrichment of enrichments) {
    placeToWebsite.set(enrichment.placeId, enrichment.website)
  }

  return placeToWebsite
}
