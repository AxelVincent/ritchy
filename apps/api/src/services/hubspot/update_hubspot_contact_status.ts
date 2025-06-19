import { logger } from '@ritchy/logger'
import type { InternalLeadStatus } from '@ritchy/types'
import {
  getValidToken,
  withHubspotClient,
} from '../../external/hubspot/token_manager'
import { createHubspotProperties } from './create_hubspot_properties'
import { getHubspotLeadMapping } from './sync/get_hubspot_lead_mapping'

/**
 * Updates the status of a HubSpot contact
 * @param userId - The user ID associated with the contact
 * @param placeId - The place ID associated with the contact
 * @param statusValue - The new status value (e.g., 'NEW', 'INTERESTED', etc.)
 */
export const updateHubspotContactStatus = async (
  userId: string,
  placeId: string,
  statusValue: InternalLeadStatus,
): Promise<void> => {
  const token = await getValidToken(userId)
  if (!token) {
    logger.info({
      msg: 'No HubSpot token found for user',
      event: 'hubspot_token_not_found',
      metadata: { userId },
    })
    return
  }
  const [contactMapping] = await getHubspotLeadMapping(placeId, token.id)

  if (!contactMapping || !contactMapping.hubspotContactId) {
    logger.error({
      msg: 'Hubspot contact mapping not found',
      event: 'hubspot_contact_mapping_not_found',
      metadata: { placeId, tokenId: token.id },
    })
    return
  }

  const properties = await createHubspotProperties(token.id, [
    {
      internalField: `status.${statusValue}`,
      value: statusValue,
    },
  ])

  logger.info({
    msg: 'Hubspot properties',
    event: 'hubspot_properties',
    metadata: { properties },
  })
  await withHubspotClient(userId, async (client) => {
    await client.crm.contacts.basicApi.update(
      String(contactMapping.hubspotContactId),
      {
        properties,
      },
    )
  })
}
