import type { Client } from '@hubspot/api-client'

import { logger } from '@ritchy/logger'
import type { ContactMapping } from '@ritchy/types'

import { fetchOrCreateContacts } from '../../../services/contact/queries/fetch_or_create_contact'
import { manageHubspotFieldMappings } from '../../../services/hubspot/manage_hubspot_field_mapping'
import { getFieldMappings } from '../../../services/hubspot/sync/get_field_mappings'
import { getLeadMappings } from '../../../services/hubspot/sync/get_lead_mappings'
import { upsertLeadMapping } from '../../../services/hubspot/sync/upsert_lead_mapping'

import type { BatchOperation, HubspotBase } from '../types'
import { getValidToken } from '../token_manager'
import { processHubspotBatch } from './helpers/batch'
import { fetchStatusData } from './helpers/fetch'
import { transformContactData } from './helpers/transformers'

/**
 * Creates or updates contacts in HubSpot using batch operations for better performance.
 * This is a more efficient version of createOrUpdateContacts that uses HubSpot's batch APIs.
 */
export const createOrUpdateContactsBatch = async (
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
    fetchStatusData(placeIds, userId),
    getLeadMappings(token.id, placeIds),
  ])

  let fieldMappings = await getFieldMappings(token.id, 'contact')

  if (fieldMappings.length === 0) {
    await manageHubspotFieldMappings({
      tokenId: token.id,
      fieldType: 'contact',
      mode: 'missing',
    })
    fieldMappings = await getFieldMappings(token.id, 'contact')
  }

  const statusMap = new Map(statusData.map((s) => [s.placeId, s.status]))
  const companyMap = new Map(
    leadMappings.map((m) => [m.placeId, m.hubspotCompanyId]),
  )

  const batchOperations: BatchOperation[] = placeIds.map((placeId, index) => {
    const contactData = contacts[index]
    const currentStatus = statusMap.get(placeId) || 'NEW'
    const properties = transformContactData(
      contactData,
      fieldMappings as ContactMapping[],
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
  })

  const results = await processHubspotBatch(
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
