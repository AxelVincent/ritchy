import type { Client } from '@hubspot/api-client'
import { logger } from '@ritchy/logger'
import type { CompanyMapping } from '@ritchy/types'
import { manageHubspotFieldMappings } from '../../../services/hubspot/manage_hubspot_field_mapping'
import { getFieldMappings } from '../../../services/hubspot/sync/get_field_mappings'
import { getLeadMappings } from '../../../services/hubspot/sync/get_lead_mappings'
import { upsertLeadMapping } from '../../../services/hubspot/sync/upsert_lead_mapping'
import { getValidToken } from '../token_manager'
import type { BatchOperation, HubspotBase } from '../types'
import { processHubspotBatch } from './helpers/batch'
import { fetchPlaces } from './helpers/fetch'
import { transformCompanyData } from './helpers/transformers'

export const createOrUpdateCompaniesBatch = async (
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
    msg: 'Starting company batch processing',
    event: 'hubspot_company_batch_start',
    metadata: { batchId, placeIds, tokenId: token.id },
  })

  const [places, leadMappings] = await Promise.all([
    fetchPlaces(placeIds),
    getLeadMappings(token.id, placeIds),
  ])

  let fieldMappings = await getFieldMappings(token.id, 'company')

  if (fieldMappings.length === 0) {
    await manageHubspotFieldMappings({
      tokenId: token.id,
      fieldType: 'company',
      mode: 'missing',
    })
    fieldMappings = await getFieldMappings(token.id, 'company')
  }

  const batchOperations: BatchOperation[] = places.map((place) => {
    const properties = transformCompanyData(
      place,
      fieldMappings as CompanyMapping[],
    )
    const existingMapping = leadMappings.find(
      (m): m is typeof m & { hubspotCompanyId: string } =>
        m.placeId === place.id && typeof m.hubspotCompanyId === 'string',
    )

    return {
      placeId: place.id,
      id: existingMapping?.hubspotCompanyId,
      properties: {
        ...properties,
        ritchy_place_id: place.id,
      },
    }
  })

  const results = await processHubspotBatch(
    batchOperations,
    client,
    'companies',
    batchId,
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
          placeId: company.placeId,
          tokenId: token.id,
          hubspotCompanyId: company.id,
        }),
      ),
    )
  }

  return results
}
