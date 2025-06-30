import { and, eq, inArray } from 'drizzle-orm'
import { db } from '../../db/db'
import { hubspotLeadMapping } from '../../db/schema'
import { getHubspotToken } from './queries/get_hubspot_token'

export const getHubspotSyncedByPlaceIds = async (
  placeIds: string[],
  userId: string,
): Promise<Map<string, boolean>> => {
  const token = await getHubspotToken(userId)
  if (!token) {
    return new Map()
  }
  const hubspotSyncedPlaces = await db
    .select()
    .from(hubspotLeadMapping)
    .where(
      and(
        inArray(hubspotLeadMapping.placeId, placeIds),
        eq(hubspotLeadMapping.tokenId, token.id),
      ),
    )

  const hubspotSyncedMap = new Map<string, boolean>()

  for (const placeId of placeIds) {
    hubspotSyncedMap.set(
      placeId,
      hubspotSyncedPlaces.some((p) => p.placeId === placeId),
    )
  }

  return hubspotSyncedMap
}
