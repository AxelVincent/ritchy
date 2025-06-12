import { db } from '../../../db/db'
import { hubspotLeadMapping } from '../../../db/schema'
import type { LeadMapping } from '../../../external/hubspot/types'

export const upsertLeadMapping = async (
  mapping: Partial<LeadMapping> & {
    placeId: string
    tokenId: string
    hubspotCompanyId: string
    hubspotContactId?: string | null
  },
) =>
  db
    .insert(hubspotLeadMapping)
    .values({
      placeId: mapping.placeId,
      tokenId: mapping.tokenId,
      hubspotCompanyId: mapping.hubspotCompanyId,
      hubspotContactId: mapping.hubspotContactId ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [hubspotLeadMapping.placeId, hubspotLeadMapping.tokenId],
      set: {
        hubspotCompanyId: mapping.hubspotCompanyId,
        hubspotContactId: mapping.hubspotContactId ?? null,
        updatedAt: new Date(),
      },
    })
