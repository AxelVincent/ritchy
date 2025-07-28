import { and } from 'drizzle-orm'
import { eq } from 'drizzle-orm'
import { db } from '../../../db/db'
import { hubspotLeadMapping } from '../../../db/schema'

export const getHubspotLeadMapping = async (
  userPlaceId: string,
  hubspotTokenId: string,
) => {
  return db
    .select()
    .from(hubspotLeadMapping)
    .where(
      and(
        eq(hubspotLeadMapping.userPlaceId, userPlaceId),
        eq(hubspotLeadMapping.hubspotTokenId, hubspotTokenId),
      ),
    )
}
