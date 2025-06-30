import { logger } from '@ritchy/logger'
import { eq } from 'drizzle-orm'
import { db } from '../../db/db'
import { hubspotLeadMapping } from '../../db/schema'

export const clearContactMapping = async (
  contactId: string,
  value: string,
): Promise<void> => {
  // Input validation
  if (!contactId?.trim()) {
    throw new Error('Contact ID is required')
  }
  // Update contact mappings using direct UPDATE with RETURNING for efficiency
  const updatedMappings = await db
    .update(hubspotLeadMapping)
    .set({
      hubspotContactId: value,
    })
    .where(eq(hubspotLeadMapping.hubspotContactId, contactId))
    .returning()

  if (updatedMappings.length === 0) {
    logger.info({
      msg: 'No lead mappings found for deleted HubSpot contact',
      event: 'hubspot_contact_deletion_no_mappings',
      metadata: {
        hubspotContactId: contactId,
      },
    })
    return
  }

  logger.info({
    msg: 'Updated HubSpot contact mappings',
    event: 'hubspot_contact_deletion_success',
    metadata: {
      hubspotContactId: contactId,
      updatedMappingsCount: updatedMappings.length,
      updatedMappings: updatedMappings.map((mapping) => ({
        id: mapping.id,
        placeId: mapping.placeId,
        tokenId: mapping.tokenId,
      })),
    },
  })
  return
}
