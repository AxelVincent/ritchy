import { and, eq, inArray } from 'drizzle-orm'
import { db } from '../../../db/db'
import { hubspotLeadMapping } from '../../../db/schema'

export const getHubspotLeadMappings = async (
  tokenId: string,
  placeIds: string[],
) =>
  db
    .select()
    .from(hubspotLeadMapping)
    .where(
      and(
        eq(hubspotLeadMapping.tokenId, tokenId),
        inArray(hubspotLeadMapping.placeId, placeIds),
      ),
    )
