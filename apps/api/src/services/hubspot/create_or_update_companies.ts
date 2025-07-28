import type { Client } from '@hubspot/api-client'
import { logger } from '@ritchy/logger'
import { sendDataToHubspot } from '../../external/hubspot/sync/send_data_to_hubspot'
import { getValidToken } from '../../external/hubspot/token_manager'
import type { BatchOperation, HubspotBase } from '../../external/hubspot/types'
import { getPlaces } from '../places/get_places'
import { manageHubspotFieldMappings } from './manage_hubspot_field_mapping'
import { getHubspotFieldMappings } from './queries/get_hubspot_field_mappings'
import { getHubspotLeadMappings } from './queries/get_hubspot_lead_mappings'
import { upsertLeadMapping } from './queries/upsert_lead_mapping'
import { createHubspotCompanyPropertiesWithMappings } from './utils/hubspot_properties_builder'

export const createOrUpdateCompanies = async (
  userPlaceIds: string[],
  userId: string,
  client: Client,
): Promise<HubspotBase[]> => {
  const token = await getValidToken(userId)
  if (!token) {
    throw new Error('No HubSpot token found for user')
  }

  logger.info({
    msg: 'Starting company batch processing',
    event: 'hubspot_company_batch_start',
    metadata: { userPlaceIds, hubspotTokenId: token.id },
  })

  const [places, leadMappings] = await Promise.all([
    getPlaces(userPlaceIds),
    getHubspotLeadMappings(token.id, userPlaceIds),
  ])

  let fieldMappings = await getHubspotFieldMappings(token.id, 'company')

  if (fieldMappings.length === 0) {
    await manageHubspotFieldMappings({
      tokenId: token.id,
      fieldType: 'company',
      mode: 'missing',
    })
    fieldMappings = await getHubspotFieldMappings(token.id, 'company')
  }

  const batchOperations: BatchOperation[] = await Promise.all(
    places.map(async (place) => {
      const properties = await createHubspotCompanyPropertiesWithMappings(
        token.id,
        place,
      )
      const existingMapping = leadMappings.find(
        (m): m is typeof m & { hubspotCompanyId: string } =>
          m.userPlaceId === place.userPlaceId &&
          typeof m.hubspotCompanyId === 'string',
      )

      return {
        userPlaceId: place.userPlaceId,
        id: existingMapping?.hubspotCompanyId,
        properties: {
          ...properties,
          ritchy_place_id: place.userPlaceId,
        },
      }
    }),
  )

  const results = await sendDataToHubspot(
    batchOperations,
    client,
    'companies',
    crypto.randomUUID(),
  )

  const newCompanies = results.filter(
    (company) => !leadMappings.some((m) => m.hubspotCompanyId === company.id),
  )

  logger.info({
    msg: 'New companies',
    event: 'hubspot_company_batch_new_companies',
    metadata: { newCompanies },
  })

  if (newCompanies.length > 0) {
    await Promise.all(
      newCompanies.map((company) =>
        upsertLeadMapping({
          userPlaceId: company.userPlaceId,
          hubspotTokenId: token.id,
          hubspotCompanyId: company.id,
        }),
      ),
    )
  }

  return results
}
