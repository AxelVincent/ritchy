import { logger } from '@ritchy/logger'
import { type InternalLeadStatus, StatusFieldEnum } from '@ritchy/types'
import type { Request } from 'express'
import {
  getValidToken,
  withHubspotClient,
} from '../../external/hubspot/token_manager'
import { createHubspotProperties } from './create_hubspot_properties'
import { getHubspotContactMapping } from './get_hubspot_contact_mapping'

/**
 * Updates the status of a HubSpot contact
 * @param req - Express request object containing user authentication
 * @param placeId - The place ID associated with the contact
 * @param statusValue - The new status value (e.g., 'NEW', 'INTERESTED', etc.)
 */
export const updateHubspotContactStatus = async (
  req: Request,
  placeId: string,
  statusValue: InternalLeadStatus,
): Promise<void> => {
  const token = await getValidToken(req.auth.userId)
  const [contactMapping] = await getHubspotContactMapping(placeId, token.id)

  if (!contactMapping) {
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
  await withHubspotClient(req.auth.userId, async (client) => {
    await client.crm.contacts.basicApi.update(contactMapping.hubspotContactId, {
      properties,
    })
  })
}
