import { and } from 'drizzle-orm'
import { eq } from 'drizzle-orm'
import { db } from '../../db/db'
import { hubspotContactMapping } from '../../db/schema'

export const getHubspotContactMapping = async (
  placeId: string,
  tokenId: string,
) => {
  return db
    .select()
    .from(hubspotContactMapping)
    .where(
      and(
        eq(hubspotContactMapping.placeId, placeId),
        eq(hubspotContactMapping.tokenId, tokenId),
      ),
    )
}
