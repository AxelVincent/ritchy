import { db } from '../../../db/db'
import { hubspotLeadMapping } from '../../../db/schema'
import type { LeadMapping } from '../../../external/hubspot/types'

export const upsertLeadMapping = async (
  mapping: Partial<LeadMapping> & {
    userPlaceId: string
    hubspotTokenId: string
    hubspotCompanyId: string
    hubspotContactId?: string | null
  },
) =>
  db
    .insert(hubspotLeadMapping)
    .values({
      userPlaceId: mapping.userPlaceId,
      hubspotTokenId: mapping.hubspotTokenId,
      hubspotCompanyId: mapping.hubspotCompanyId,
      hubspotContactId: mapping.hubspotContactId ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [
        hubspotLeadMapping.userPlaceId,
        hubspotLeadMapping.hubspotTokenId,
      ],
      set: {
        hubspotCompanyId: mapping.hubspotCompanyId,
        hubspotContactId: mapping.hubspotContactId ?? null,
        updatedAt: new Date(),
      },
    })
