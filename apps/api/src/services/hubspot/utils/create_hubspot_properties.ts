import { logger } from '@ritchy/logger'
import {
  type InternalField,
  type InternalLeadStatus,
  LEAD_STATUS_MAPPING,
} from '@ritchy/types'
import { and, eq, inArray } from 'drizzle-orm'
import { db } from '../../../db/db'
import { hubspotFieldMapping } from '../../../db/schema'

type FieldUpdate = {
  internalField: InternalField
  value: string
}

/**
 * Creates a HubSpot properties object from an array of field updates
 */
export const createHubspotProperties = async (
  tokenId: string,
  updates: FieldUpdate[],
): Promise<Record<string, string>> => {
  logger.info({
    msg: 'Creating Hubspot properties',
    event: 'hubspot_properties_create',
    metadata: { updates, tokenId },
  })

  // Get all relevant field mappings
  const mappings = await db
    .select()
    .from(hubspotFieldMapping)
    .where(
      and(
        eq(hubspotFieldMapping.tokenId, tokenId),
        inArray(
          hubspotFieldMapping.internalField,
          updates.map((update) => update.internalField),
        ),
      ),
    )

  logger.info({
    msg: 'Hubspot field mappings',
    event: 'hubspot_field_mappings',
    metadata: { mappings },
  })

  const properties: Record<string, string> = {}

  // Transform each field using its mapping
  for (const { internalField, value } of updates) {
    const mapping = mappings.find((m) => m.internalField === internalField)
    if (!mapping) {
      logger.warn({
        msg: 'No mapping found for field',
        event: 'hubspot_field_mapping_not_found',
        metadata: { internalField, tokenId },
      })
      continue
    }

    // Handle status fields
    if (internalField.startsWith('status.')) {
      const status = value as InternalLeadStatus
      properties.hs_lead_status = LEAD_STATUS_MAPPING[status]
    }
  }

  return properties
}
