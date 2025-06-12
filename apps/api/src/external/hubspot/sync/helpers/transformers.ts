import { logger } from '@ritchy/logger'
import type {
  CompanyMapping,
  ContactMapping,
  InternalLeadStatus,
  PlaceBase,
} from '@ritchy/types'
import { LEAD_STATUS_MAPPING } from '@ritchy/types'
import type { Contact } from '../../../../db/schema'

export const transformContactData = (
  contactData: Pick<Contact, 'firstname' | 'lastname' | 'email' | 'phone'>,
  mappings: ContactMapping[],
  currentStatus: InternalLeadStatus,
): Record<string, string> => {
  const properties: Record<string, string> = {}

  // Group mappings by type for better organization
  const contactMappings = mappings.filter((m) =>
    m.internalField.startsWith('contact.'),
  )

  // Transform contact fields
  for (const mapping of contactMappings) {
    const field = mapping.internalField.replace(
      'contact.',
      '',
    ) as keyof typeof contactData
    const value = contactData[field]
    if (value) {
      properties[mapping.hubspotField] = value
    }
  }

  // Transform status field
  const hubspotStatus =
    LEAD_STATUS_MAPPING[currentStatus as keyof typeof LEAD_STATUS_MAPPING]
  properties.hs_lead_status = hubspotStatus

  logger.info({
    msg: 'Transformed contact data details',
    event: 'hubspot_contact_transform_details',
    metadata: {
      contactFields: Object.fromEntries(
        contactMappings.map((m) => [
          m.internalField,
          {
            hubspotField: m.hubspotField,
            value:
              contactData[
                m.internalField.replace(
                  'contact.',
                  '',
                ) as keyof typeof contactData
              ],
          },
        ]),
      ),
      status: {
        hubspotField: 'hs_lead_status',
        value: properties.hs_lead_status,
        internalStatus: currentStatus,
        hubspotStatus,
      },
    },
  })

  return properties
}

export const transformCompanyData = (
  place: PlaceBase,
  mappings: CompanyMapping[],
): Record<string, string> => {
  const properties: Record<string, string> = {
    ritchy_place_id: place.id,
  }

  // Create a map of internal fields to HubSpot fields
  const fieldMap = new Map(
    mappings.map((m) => [m.internalField, m.hubspotField]),
  )

  // Transform each field according to mapping
  for (const [internalField, hubspotField] of fieldMap.entries()) {
    let value: string | undefined

    switch (internalField) {
      case 'company.name':
        value = place.name
        break
      case 'company.website':
        value = place.website ? new URL(place.website).hostname : ''
        break
      case 'company.country':
        value = place.address.country || ''
        break
      case 'company.postalCode':
        value = place.address.postalCode || ''
        break
      case 'company.street':
        value = place.address.streetNumber
          ? `${place.address.streetNumber} ${place.address.street}`
          : place.address.street || ''
        break
      case 'company.locality':
        value = place.address.locality || ''
        break
      case 'company.region':
        value = place.address.administrativeAreaLevel1 || ''
        break
      case 'company.phone':
        value = place.phone || ''
        break
    }

    if (value !== undefined) {
      properties[hubspotField] = value
    }
  }

  return properties
}
