import { eq } from 'drizzle-orm'
import { logger } from 'packages/logger/dist'
import { db } from '../../db/db'
import { hubspotLeadMapping } from '../../db/schema'

export const updateContactMapping = async (
  contactId: string,
  value: string,
) => {
  const contactMappings = await db
    .select()
    .from(hubspotLeadMapping)
    .where(eq(hubspotLeadMapping.hubspotContactId, contactId))
  if (contactMappings.length === 0) {
    logger.info({
      msg: 'No lead mappings found for deleted HubSpot contact',
      event: 'hubspot_contact_deletion_no_mappings',
      metadata: {
        hubspotContactId: contactId,
      },
    })
  }
  const deletedMappings = await db
    .update(hubspotLeadMapping)
    .set({
      hubspotContactId: value,
    })
    .where(eq(hubspotLeadMapping.hubspotContactId, contactId))
    .returning()

  logger.info({
    msg: 'Updated HubSpot contact mappings',
    event: 'hubspot_contact_deletion_success',
    metadata: {
      hubspotContactId: contactId,
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
