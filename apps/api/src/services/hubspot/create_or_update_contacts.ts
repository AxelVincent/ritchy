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
  userPlaceIds: string[],
  userId: string,
  client: Client
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
      placeCount: userPlaceIds.length,
      tokenId: token.id,
      userId
    }
  })

  const [contacts, statusData, leadMappings] = await Promise.all([
    fetchOrCreateContacts(userPlaceIds, userId),
    getPlacesStatus(userPlaceIds, userId),
    getHubspotLeadMappings(token.id, userPlaceIds)
  ])

  const statusMap = new Map(statusData.map((s) => [s.user_place.id, s.status]))
  const companyMap = new Map(
    leadMappings.map((m) => [m.userPlaceId, m.hubspotCompanyId])
  )

  const batchOperations: BatchOperation[] = await Promise.all(
    userPlaceIds.map(async (userPlaceId, index) => {
      const contactData = contacts[index]
      const currentStatus = statusMap.get(userPlaceId)?.status || 'NEW'

      const properties = await createHubspotContactPropertiesWithMappings(
        token.id,
        contactData,
        currentStatus
      )

      const existingMapping = leadMappings.find(
        (m): m is typeof m & { hubspotContactId: string } =>
          m.userPlaceId === userPlaceId &&
          typeof m.hubspotContactId === 'string'
      )

      return {
        userPlaceId,
        id: existingMapping?.hubspotContactId,
        properties: {
          ...properties,
          ritchy_place_id: userPlaceId,
          ...(companyMap.get(userPlaceId) && {
            associatedcompanyid: companyMap.get(userPlaceId) as string
          })
        }
      }
    })
  )

  const results = await sendDataToHubspot(
    batchOperations,
    client,
    'contacts',
    batchId
  )

  const newContacts = results.filter(
    (contact) => !leadMappings.some((m) => m.hubspotContactId === contact.id)
  )

  if (newContacts.length > 0) {
    await Promise.all(
      newContacts.map((contact) =>
        upsertLeadMapping({
          userPlaceId: contact.userPlaceId,
          hubspotTokenId: token.id,
          hubspotContactId: contact.id,
          hubspotCompanyId: companyMap.get(contact.userPlaceId) as string
        })
      )
    )
  }

  return results
}
