import type { Client } from '@hubspot/api-client'

import { logger } from '@ritchy/logger'

import { fetchOrCreateContacts } from '../contact/fetch_or_create_contact'

import { getHubspotLeadMappings } from './queries/get_hubspot_lead_mappings'
import { upsertLeadMapping } from './queries/upsert_lead_mapping'

import { sendDataToHubspot } from '../../external/hubspot/sync/send_data_to_hubspot'
import { getValidToken } from '../../external/hubspot/token_manager'
import type { BatchOperation, HubspotBase } from '../../external/hubspot/types'
import { getPlacesStatus } from '../places/status/queries/get_places_status'
import { createHubspotContactPropertiesWithMappings } from './utils/hubspot_properties_builder'

/**
 * Creates or updates contacts in HubSpot using batch operations for better performance.
 * This is a more efficient version of createOrUpdateContacts that uses HubSpot's batch APIs.
 */
export const createOrUpdateContacts = async (
  placeIds: string[],
  userId: string,
  client: Client,
): Promise<HubspotBase[]> => {
  const token = await getValidToken(userId)
  if (!token) {
    throw new Error('No HubSpot token found for user')
  }
  const batchId = crypto.randomUUID()

  logger.info({
    msg: 'Starting contact batch processing',
    event: 'hubspot_contact_batch_start',
    metadata: {
      batchId,
      placeCount: placeIds.length,
      tokenId: token.id,
      userId,
    },
  })

  const [contacts, statusData, leadMappings] = await Promise.all([
    fetchOrCreateContacts(placeIds, userId),
    getPlacesStatus(placeIds, userId),
    getHubspotLeadMappings(token.id, placeIds),
  ])

  const statusMap = new Map(statusData.map((s) => [s.placeId, s.status]))
  const companyMap = new Map(
    leadMappings.map((m) => [m.placeId, m.hubspotCompanyId]),
  )

  const batchOperations: BatchOperation[] = await Promise.all(
    placeIds.map(async (placeId, index) => {
      const contactData = contacts[index]
      const currentStatus = statusMap.get(placeId) || 'NEW'

      const properties = await createHubspotContactPropertiesWithMappings(
        token.id,
        contactData,
        currentStatus,
      )

      const existingMapping = leadMappings.find(
        (m): m is typeof m & { hubspotContactId: string } =>
          m.placeId === placeId && typeof m.hubspotContactId === 'string',
      )

      return {
        placeId,
        id: existingMapping?.hubspotContactId,
        properties: {
          ...properties,
          ritchy_place_id: placeId,
          ...(companyMap.get(placeId) && {
            associatedcompanyid: companyMap.get(placeId) as string,
          }),
        },
      }
    }),
  )

  const results = await sendDataToHubspot(
    batchOperations,
    client,
    'contacts',
    batchId,
  )

  const newContacts = results.filter(
    (contact) => !leadMappings.some((m) => m.hubspotContactId === contact.id),
  )

  if (newContacts.length > 0) {
    await Promise.all(
      newContacts.map((contact) =>
        upsertLeadMapping({
          placeId: contact.placeId,
          tokenId: token.id,
          hubspotContactId: contact.id,
          hubspotCompanyId: companyMap.get(contact.placeId) as string,
        }),
      ),
    )
  }

  return results
}
