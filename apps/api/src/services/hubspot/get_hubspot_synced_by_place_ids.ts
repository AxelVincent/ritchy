import { and, eq, inArray } from 'drizzle-orm'
import { db } from '../../db/db'
import { hubspotLeadMapping } from '../../db/schema'
import { getHubspotToken } from './queries/get_hubspot_token'

export const getHubspotSyncedByPlaceIds = async (
  userPlaceIds: string[],
  userId: string
): Promise<Map<string, boolean>> => {
  const token = await getHubspotToken(userId)
  if (!token) {
    return new Map()
  }
  const hubspotSyncedPlaces = await db
    .select()
    .from(hubspotLeadMapping)
    .where(inArray(hubspotLeadMapping.userPlaceId, userPlaceIds))

  const hubspotSyncedMap = new Map<string, boolean>()

  for (const userPlaceId of userPlaceIds) {
    hubspotSyncedMap.set(
      userPlaceId,
      hubspotSyncedPlaces.some((p) => p.userPlaceId === userPlaceId)
    )
  }

  return hubspotSyncedMap
}
