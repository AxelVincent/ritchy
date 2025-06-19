import { logger } from '@ritchy/logger'
import {
  type CompanyField,
  type ContactField,
  FIELD_CONFIGS,
  type StatusField,
} from '@ritchy/types'
import { and, eq, like, sql } from 'drizzle-orm'
import { db } from '../../db/db'
import { hubspotFieldMapping } from '../../db/schema'

type FieldType = 'contact' | 'company' | 'status'

type MappingInput = {
  tokenId: string
  fieldType: FieldType
  mode?: MappingMode
}

type MappingResult = {
  tokenId: string
  internalField: ContactField | CompanyField | StatusField
  hubspotField: string
  createdAt: Date
  updatedAt: Date
}

type MappingMode = 'missing' | 'reset'

/**
 * Manages HubSpot field mappings by either creating missing mappings or resetting to defaults
 * @param params.tokenId - The HubSpot token ID to associate the mappings with
 * @param params.fieldType - The type of fields to manage ('contact' or 'company')
 * @param params.mode - The mode of operation ('missing' to create only missing mappings, 'reset' to reset all to defaults)
 * @returns Promise<MappingResult[]> - The managed mappings
 */
export const manageHubspotFieldMappings = async ({
  tokenId,
  fieldType,
  mode = 'missing',
}: MappingInput): Promise<MappingResult[]> => {
  const now = new Date()
  const config = FIELD_CONFIGS[fieldType]

  logger.info({
    msg: 'Starting HubSpot field mapping management',
    event: 'hubspot_field_mapping_start',
    metadata: { tokenId, fieldType, mode },
  })

  if (mode === 'reset') {
    logger.info({
      msg: `Resetting all ${fieldType} field mappings to defaults`,
      event: 'hubspot_field_mapping_reset',
      metadata: { tokenId, fieldType, fieldCount: Object.keys(config).length },
    })

    const resetMappings = Object.entries(config).map(
      ([field, fieldConfig]) => ({
        tokenId,
        internalField: `${fieldType}.${field}` as
          | ContactField
          | CompanyField
          | StatusField,
        hubspotField: fieldConfig.defaultHubspotField,
        createdAt: now,
        updatedAt: now,
      }),
    )

    const insertedMappings = await db
      .insert(hubspotFieldMapping)
      .values(resetMappings)
      .onConflictDoUpdate({
        target: [
          hubspotFieldMapping.tokenId,
          hubspotFieldMapping.internalField,
        ],
        set: {
          hubspotField: sql`EXCLUDED.hubspot_field`,
          updatedAt: now,
        },
      })
      .returning()

    logger.info({
      msg: `Successfully reset ${fieldType} field mappings`,
      event: 'hubspot_field_mapping_reset_success',
      metadata: { tokenId, fieldType, mappingCount: insertedMappings.length },
    })

    return insertedMappings
  }

  // Mode: 'missing' - only create mappings for missing fields
  const existingMappings = await db
    .select()
    .from(hubspotFieldMapping)
    .where(
      and(
        eq(hubspotFieldMapping.tokenId, tokenId),
        like(hubspotFieldMapping.internalField, `${fieldType}.%`),
      ),
    )

  logger.info({
    msg: `Found existing ${fieldType} field mappings`,
    event: 'hubspot_field_mapping_existing',
    metadata: { tokenId, fieldType, existingCount: existingMappings.length },
  })

  const existingFields = new Set(existingMappings.map((m) => m.internalField))
  const newMappings = Object.entries(config)
    .filter(
      ([field]) =>
        !existingFields.has(
          `${fieldType}.${field}` as ContactField | CompanyField | StatusField,
        ),
    )
    .map(([field, fieldConfig]) => ({
      tokenId,
      internalField: `${fieldType}.${field}` as
        | ContactField
        | CompanyField
        | StatusField,
      hubspotField: fieldConfig.defaultHubspotField,
      createdAt: now,
      updatedAt: now,
    }))

  if (newMappings.length === 0) {
    logger.info({
      msg: `No new ${fieldType} field mappings needed`,
      event: 'hubspot_field_mapping_no_new',
      metadata: { tokenId, fieldType },
    })
    return existingMappings
  }

  logger.info({
    msg: `Creating new ${fieldType} field mappings`,
    event: 'hubspot_field_mapping_create',
    metadata: { tokenId, fieldType, newCount: newMappings.length },
  })

  const insertedMappings = await db
    .insert(hubspotFieldMapping)
    .values(newMappings)
    .returning()

  logger.info({
    msg: `Successfully created new ${fieldType} field mappings`,
    event: 'hubspot_field_mapping_create_success',
    metadata: { tokenId, fieldType, createdCount: insertedMappings.length },
  })

  return [...existingMappings, ...insertedMappings]
}

/**
 * Creates both contact and company field mappings in a single transaction
 * @param params.tokenId - The HubSpot token ID to associate the mappings with
 * @returns Promise<MappingResult[]> - All created mappings
 */
export const createAllHubspotFieldMappings = async (
  tokenId: string,
): Promise<MappingResult[]> => {
  // Create both contact and company mappings
  const [contactMappings, companyMappings] = await Promise.all([
    manageHubspotFieldMappings({
      tokenId,
      fieldType: 'contact',
      mode: 'reset',
    }),
    manageHubspotFieldMappings({
      tokenId,
      fieldType: 'company',
      mode: 'reset',
    }),
    manageHubspotFieldMappings({
      tokenId,
      fieldType: 'status',
      mode: 'reset',
    }),
  ])

  return [...contactMappings, ...companyMappings]
}
