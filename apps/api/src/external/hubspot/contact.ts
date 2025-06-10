import type { Client } from '@hubspot/api-client'
import { logger } from '@ritchy/logger'
import {
  ContactFieldEnum,
  type ContactMapping,
  type InternalLeadStatus,
  LEAD_STATUS_MAPPING,
  StatusFieldEnum,
} from '@ritchy/types'
import { and, eq, inArray } from 'drizzle-orm'
import type { InferSelectModel } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../db/db'
import {
  contact,
  hubspotContactMapping,
  hubspotFieldMapping,
  status,
} from '../../db/schema'
import { createDefaultMappings } from '../../routes_web/hubspot/mappings/contact'
import { getHubspotContactMapping } from '../../services/hubspot/get_hubspot_contact_mapping'
import { getPlaceDetailsV1 } from '../google_maps/place_details_V1'
import { getValidToken } from './token_manager'
import {
  type HubspotBase,
  HubspotBaseSchema,
  type PlaceCompanyMapping,
} from './types'

type Contact = InferSelectModel<typeof contact>

export const createOrUpdateContacts = async (
  placeIds: string[],
  userId: string,
  client: Client,
  placeCompanyMappings: PlaceCompanyMapping[],
): Promise<HubspotBase[]> => {
  const contacts: HubspotBase[] = []

  // Get the token using token manager
  const token = await getValidToken(userId)

  // Ensure mappings exist
  const existingMappings = await db
    .select()
    .from(hubspotFieldMapping)
    .where(
      and(
        eq(hubspotFieldMapping.tokenId, token.id),
        inArray(hubspotFieldMapping.internalField, [
          ...ContactFieldEnum.options,
          ...StatusFieldEnum.options,
        ]),
      ),
    )

  // If no mappings exist, create default ones
  if (existingMappings.length === 0) {
    const defaultMappings = createDefaultMappings(token.id)
    await db.insert(hubspotFieldMapping).values(defaultMappings)
  }

  for (const placeId of placeIds) {
    // Get or create contact in our database
    let [contactData] = await db
      .select()
      .from(contact)
      .where(and(eq(contact.placeId, placeId), eq(contact.userId, userId)))

    // Get current status for this contact
    const [statusData] = await db
      .select()
      .from(status)
      .where(and(eq(status.placeId, placeId), eq(status.userId, userId)))

    const currentStatus = statusData?.status || 'NEW'

    if (!contactData) {
      // Get place data to create contact
      const place = await getPlaceDetailsV1(placeId)

      // Create contact in our database
      const [newContact] = await db
        .insert(contact)
        .values({
          placeId,
          userId,
          firstname: place.name.split(' ')[0] || '',
          lastname: place.name.split(' ').slice(1).join(' ') || '',
          phone: place.phone || '',
          email: '',
        })
        .returning()

      contactData = newContact
    }

    // Get mappings with proper filtering
    const mappings = await db
      .select()
      .from(hubspotFieldMapping)
      .where(
        and(
          eq(hubspotFieldMapping.tokenId, token.id),
          inArray(hubspotFieldMapping.internalField, [
            ...ContactFieldEnum.options,
            ...StatusFieldEnum.options,
          ]),
        ),
      )

    // Transform contact data using mappings
    const properties = transformContactData(
      contactData as Pick<
        Contact,
        'firstname' | 'lastname' | 'email' | 'phone'
      >,
      mappings as ContactMapping[],
      currentStatus,
    )

    const companyMapping = placeCompanyMappings.find(
      (m) => m.placeId === placeId,
    )
    if (companyMapping) {
      properties.associatedcompanyid = companyMapping.hubspotCompanyId

      logger.info({
        msg: 'Associating contact with company',
        event: 'hubspot_contact_company_association',
        metadata: {
          placeId,
          placeName: companyMapping.placeName,
          hubspotCompanyId: companyMapping.hubspotCompanyId,
        },
      })
    }

    logger.info({
      msg: 'Transformed contact data',
      event: 'hubspot_contact_transform_data',
      metadata: {
        properties,
        contactData,
        placeId,
        tokenId: token.id,
        status: currentStatus,
      },
    })

    // Check for existing mapping
    const [existingMapping] = await getHubspotContactMapping(placeId, token.id)

    try {
      let hubspotContact: HubspotBase

      if (existingMapping) {
        // Update existing contact
        const response = await client.crm.contacts.basicApi.update(
          existingMapping.hubspotContactId,
          { properties },
        )
        hubspotContact = HubspotBaseSchema.parse(response)
      } else {
        // Create new contact
        const response = await client.crm.contacts.basicApi.create({
          properties,
        })
        hubspotContact = HubspotBaseSchema.parse(response)

        // Store mapping
        await db.insert(hubspotContactMapping).values({
          placeId,
          hubspotContactId: hubspotContact.id,
          tokenId: token.id,
        })
      }

      contacts.push(hubspotContact)
    } catch (error) {
      logger.error({
        msg: 'Failed to create/update HubSpot contact',
        event: 'hubspot_contact_error',
        metadata: { error, placeId, tokenId: token.id },
      })
      throw error
    }
  }

  return contacts
}

function transformContactData(
  contactData: Pick<Contact, 'firstname' | 'lastname' | 'email' | 'phone'>,
  mappings: ContactMapping[],
  currentStatus: InternalLeadStatus,
): Record<string, string> {
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

    // Only set the property if we have a value
    if (value) {
      properties[mapping.hubspotField] = value
    }
  }

  // Transform status field
  const hubspotStatus =
    LEAD_STATUS_MAPPING[currentStatus as keyof typeof LEAD_STATUS_MAPPING]
  properties.hs_lead_status = hubspotStatus

  logger.debug({
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
        hubspotStatus: hubspotStatus,
      },
    },
  })

  return properties
}
