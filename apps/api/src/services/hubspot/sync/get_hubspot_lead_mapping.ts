import { and } from 'drizzle-orm'
import { eq } from 'drizzle-orm'
import { db } from '../../../db/db'
import { hubspotLeadMapping } from '../../../db/schema'

export const getHubspotLeadMapping = async (
  placeId: string,
  tokenId: string,
) => {
  return db
    .select()
    .from(hubspotLeadMapping)
    .where(
      and(
        eq(hubspotLeadMapping.placeId, placeId),
        eq(hubspotLeadMapping.tokenId, tokenId),
      ),
    )
}
