import { logger } from '@ritchy/logger'
import { and, eq } from 'drizzle-orm'
import { db } from '../../db/db'
import { hubspotLeadMapping, hubspotToken } from '../../db/schema'
import { getHubspotTokenByPortalId } from './queries/get_hubspot_token_by_portal_id'

export const deleteCompanyMapping = async (
  companyId: string,
  tokenId: string,
): Promise<void> => {
  // Input validation
  if (!companyId?.trim()) {
    throw new Error('Company ID is required')
  }
  if (!tokenId?.trim()) {
    throw new Error('Token ID is required')
  }

  // Delete all lead mappings for this company using DELETE ... RETURNING for efficiency
  const deletedMappings = await db
    .delete(hubspotLeadMapping)
    .where(
      and(
        eq(hubspotLeadMapping.hubspotCompanyId, companyId),
        eq(hubspotLeadMapping.tokenId, tokenId),
      ),
    )
    .returning()

  if (deletedMappings.length === 0) {
    logger.info({
      msg: 'No lead mappings found for deleted HubSpot company',
      event: 'hubspot_company_deletion_no_mappings',
      metadata: {
        hubspotCompanyId: companyId,
      },
    })
    return
  }

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
