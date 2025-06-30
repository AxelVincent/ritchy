import { and, eq } from 'drizzle-orm'
import { logger } from 'packages/logger/dist'
import { db } from '../../db/db'
import { hubspotLeadMapping } from '../../db/schema'

export const deleteCompanyMapping = async (companyId: string) => {
  // Find all lead mappings that reference this company
  const companyLeadMappings = await db
    .select()
    .from(hubspotLeadMapping)
    .where(and(eq(hubspotLeadMapping.hubspotCompanyId, companyId)))
  if (companyLeadMappings.length === 0) {
    logger.info({
      msg: 'No lead mappings found for deleted HubSpot company',
      event: 'hubspot_company_deletion_no_mappings',
      metadata: {
        hubspotCompanyId: companyId,
      },
    })
    return
  }

  // Delete all lead mappings for this company
  const deletedMappings = await db
    .delete(hubspotLeadMapping)
    .where(and(eq(hubspotLeadMapping.hubspotCompanyId, companyId)))
    .returning()

  logger.info({
    msg: 'Deleted HubSpot company mappings',
    event: 'hubspot_company_deletion_success',
    metadata: {
      hubspotCompanyId: companyId,
      deletedMappingsCount: deletedMappings.length,
      deletedMappings: deletedMappings.map((mapping) => ({
        id: mapping.id,
        placeId: mapping.placeId,
        tokenId: mapping.tokenId,
      })),
    },
  })
  return
}
