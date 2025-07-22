import { and, eq, inArray } from 'drizzle-orm'
import { db } from '../../../db/db'
import { hubspotLeadMapping } from '../../../db/schema'

export const getHubspotLeadMappings = async (
  tokenId: string,
  userPlaceIds: string[]
) =>
  db
    .select()
    .from(hubspotLeadMapping)
    .where(
      and(
        eq(hubspotLeadMapping.hubspotTokenId, tokenId),
        inArray(hubspotLeadMapping.userPlaceId, userPlaceIds)
      )
    )
