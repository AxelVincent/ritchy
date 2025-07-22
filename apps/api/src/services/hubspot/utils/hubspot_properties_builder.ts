import { logger } from '@ritchy/logger'
import type {
  CompanyMapping,
  ContactMapping,
  InternalField,
  InternalLeadStatus,
  Place,
  PlaceBase
} from '@ritchy/types'
import { LEAD_STATUS_MAPPING } from '@ritchy/types'
import { and, eq, inArray, like, sql } from 'drizzle-orm'
import { db } from '../../../db/db'
import type { Contact } from '../../../db/schema'
import { hubspotFieldMapping } from '../../../db/schema'
import { manageHubspotFieldMappings } from '../manage_hubspot_field_mapping'

type Properties = Record<string, string>
type Mapping = ContactMapping | CompanyMapping

// Get mappings with auto-creation if missing
const getOrCreateFieldMappings = async (
  tokenId: string,
  fieldType: 'contact' | 'company'
): Promise<Mapping[]> => {
  let mappings = await db
    .select()
    .from(hubspotFieldMapping)
    .where(
      and(
        eq(hubspotFieldMapping.hubspotTokenId, tokenId),
        like(sql`${hubspotFieldMapping.internalField}::text`, `${fieldType}.%`)
      )
    )

  if (mappings.length === 0) {
    logger.info({
      msg: 'No field mappings found, creating defaults',
      event: 'hubspot_field_mappings_creating',
      metadata: { tokenId, fieldType }
    })

    await manageHubspotFieldMappings({
      tokenId,
      fieldType,
      mode: 'missing'
    })

    mappings = await db
      .select()
      .from(hubspotFieldMapping)
      .where(
        and(
          eq(hubspotFieldMapping.hubspotTokenId, tokenId),
          like(
            sql`${hubspotFieldMapping.internalField}::text`,
            `${fieldType}.%`
          )
        )
      )
  }

  return mappings
}

// Simple field value extractors
const getContactValue = (
  contact: Pick<Contact, 'firstName' | 'lastName'>,
  field: string
): string | undefined => {
  const value = contact[field as keyof typeof contact]
  return value || undefined
}

const getCompanyValue = (
  place: PlaceBase,
  field: string
): string | undefined => {
  switch (field) {
    case 'name':
      return place.name || undefined
    case 'website':
      if (!place.website) return undefined
      try {
        return new URL(place.website).hostname
      } catch {
        throw new Error(`Invalid website URL: ${place.website}`)
      }
    case 'phone':
      return place.phone || undefined
    case 'street':
      return place.address.streetNumber
        ? `${place.address.streetNumber} ${place.address.street}`
        : place.address.street || undefined
    case 'locality':
      return place.address.locality || undefined
    case 'region':
      return place.address.administrativeAreaLevel1 || undefined
    case 'postalCode':
      return place.address.postalCode || undefined
    case 'country':
      return place.address.country || undefined
    default:
      return undefined
  }
}

// Main transformation function
const transformMappings = (
  mappings: Mapping[],
  getValue: (field: string) => string | undefined
): Properties => {
  const properties: Properties = {}

  for (const mapping of mappings) {
    const fieldName = mapping.internalField.split('.')[1]
    if (!fieldName) continue

    const value = getValue(fieldName)
    if (value) {
      properties[mapping.hubspotField] = value
    }
  }

  return properties
}

// Enhanced functions that handle mapping retrieval
export const createHubspotContactPropertiesWithMappings = async (
  tokenId: string,
  contactData: Pick<Contact, 'firstName' | 'lastName'>,
  currentStatus: InternalLeadStatus
): Promise<Properties> => {
  const mappings = await getOrCreateFieldMappings(tokenId, 'contact')
  const contactMappings = mappings.filter((m) =>
    m.internalField.startsWith('contact.')
  )

  const properties = transformMappings(contactMappings, (field) =>
    getContactValue(contactData, field)
  )

  properties.hs_lead_status = LEAD_STATUS_MAPPING[currentStatus]
  return properties
}

export const createHubspotCompanyPropertiesWithMappings = async (
  tokenId: string,
  place: PlaceBase & { userPlaceId: string }
): Promise<Properties> => {
  const mappings = await getOrCreateFieldMappings(tokenId, 'company')

  const properties = transformMappings(mappings, (field) =>
    getCompanyValue(place, field)
  )

  properties.ritchy_place_id = place.userPlaceId
  return properties
}

// Original functions (backward compatible)
export const createHubspotContactProperties = (
  contactData: Pick<Contact, 'firstName' | 'lastName'>,
  mappings: ContactMapping[],
  currentStatus: InternalLeadStatus
): Properties => {
  const contactMappings = mappings.filter((m) =>
    m.internalField.startsWith('contact.')
  )

  const properties = transformMappings(contactMappings, (field) =>
    getContactValue(contactData, field)
  )

  properties.hs_lead_status = LEAD_STATUS_MAPPING[currentStatus]
  return properties
}

export const createHubspotCompanyProperties = (
  place: PlaceBase & { userPlaceId: string },
  mappings: CompanyMapping[]
): Properties => {
  const properties = transformMappings(mappings, (field) =>
    getCompanyValue(place, field)
  )

  properties.ritchy_place_id = place.userPlaceId
  return properties
}

export const createHubspotProperties = async (
  tokenId: string,
  updates: Array<{ internalField: InternalField; value: string }>
): Promise<Properties> => {
  logger.info({
    msg: 'Creating Hubspot properties from field updates',
    event: 'hubspot_properties_create',
    metadata: { updates, tokenId }
  })

  const mappings = await db
    .select()
    .from(hubspotFieldMapping)
    .where(
      and(
        eq(hubspotFieldMapping.hubspotTokenId, tokenId),
        inArray(
          hubspotFieldMapping.internalField,
          updates.map((update) => update.internalField)
        )
      )
    )

  if (mappings.length === 0) {
    logger.warn({
      msg: 'No field mappings found',
      event: 'hubspot_field_mappings_empty',
      metadata: { tokenId, updates }
    })
    return {}
  }

  const properties: Properties = {}

  for (const { internalField, value } of updates) {
    if (internalField.startsWith('status.')) {
      properties.hs_lead_status =
        LEAD_STATUS_MAPPING[value as InternalLeadStatus]
    }
  }

  return properties
}
