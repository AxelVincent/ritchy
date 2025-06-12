import type { Client } from '@hubspot/api-client'
import {
  PropertyCreateFieldTypeEnum,
  PropertyCreateTypeEnum,
} from '@hubspot/api-client/lib/codegen/crm/properties'
import { logger } from '@ritchy/logger'
import { z } from 'zod'
import { withHubspotClient } from './token_manager'

// Schema for HubSpot property
const HubspotPropertySchema = z.object({
  name: z.string(),
  label: z.string(),
  type: z.string(),
  fieldType: z.string(),
  description: z.string(),
  groupName: z.string(),
  options: z.array(
    z.object({
      label: z.string(),
      value: z.string(),
      description: z.string().optional(),
    }),
  ),
  hubspotDefined: z.boolean().optional(),
  calculated: z.boolean().optional(),
  hasUniqueValue: z.boolean().optional(),
  archived: z.boolean().optional(),
})

const RITCHY_PLACE_ID_PROPERTY_NAME = 'ritchy_place_id'

export type HubspotProperty = z.infer<typeof HubspotPropertySchema>

export const getHubspotProperties = async (
  client: Client,
  objectType: 'companies' | 'contacts',
) => {
  try {
    // Get properties for the specified object type only
    const response = await client.crm.properties.coreApi.getAll(objectType)

    // Parse and validate properties, excluding ritchy_place_id
    const properties = response.results
      .filter((property) => property.name !== RITCHY_PLACE_ID_PROPERTY_NAME)
      .map((property) => {
        try {
          return {
            ...HubspotPropertySchema.parse({
              name: property.name,
              label: property.label,
              type: property.type,
              fieldType: property.fieldType,
              description: property.description,
              groupName: property.groupName,
              options: property.options,
              hubspotDefined: property.hubspotDefined,
              calculated: property.calculated,
              hasUniqueValue: property.hasUniqueValue,
              archived: property.archived,
            }),
            objectType,
          }
        } catch (error) {
          logger.warn({
            msg: 'Failed to parse HubSpot property',
            event: 'hubspot_property_parse_error',
            metadata: { error, property, objectType },
          })
          return null
        }
      })
      .filter(
        (
          prop,
        ): prop is HubspotProperty & { objectType: 'companies' | 'contacts' } =>
          prop !== null,
      )

    // Group properties by their group
    const groupedProperties = properties.reduce(
      (acc, prop) => {
        const key = prop.groupName
        if (!acc[key]) {
          acc[key] = []
        }
        acc[key].push(prop)
        return acc
      },
      {} as Record<
        string,
        (HubspotProperty & { objectType: 'companies' | 'contacts' })[]
      >,
    )

    return {
      properties,
      groupedProperties,
    }
  } catch (error) {
    logger.error({
      msg: 'Failed to fetch HubSpot properties',
      event: 'hubspot_properties_fetch_error',
      metadata: { error, objectType },
    })
    throw error
  }
}

export async function createCustomHubspotProperties(userId: string) {
  await withHubspotClient(userId, async (client) => {
    // Create property groups for both companies and contacts
    for (const objectType of ['companies', 'contacts'] as const) {
      try {
        await client.crm.properties.groupsApi.create(objectType, {
          name: 'ritchy',
          label: 'Ritchy',
          displayOrder: 0,
        })
      } catch (error) {
        // Ignore if group already exists
        if (
          !(error instanceof Error && 'code' in error && error.code === 409)
        ) {
          throw error
        }
      }

      // Create ritchy_place_id property for each object type
      try {
        await client.crm.properties.coreApi.create(objectType, {
          name: RITCHY_PLACE_ID_PROPERTY_NAME,
          label: 'Ritchy Place ID',
          type: PropertyCreateTypeEnum.String,
          fieldType: PropertyCreateFieldTypeEnum.Text,
          groupName: 'ritchy',
          description: 'Google Places ID for this record',
          options: [],
          displayOrder: 0,
          hasUniqueValue: false,
          hidden: false,
          formField: true,
        })
      } catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 409) {
          logger.info({
            msg: `Property ritchy_place_id already exists for ${objectType}`,
            event: 'hubspot_property_create_success',
          })
        } else {
          throw error
        }
      }
    }
  })
}

export async function deleteCustomHubspotProperties(userId: string) {
  await withHubspotClient(userId, async (client) => {
    for (const objectType of ['companies', 'contacts'] as const) {
      try {
        // First archive the property
        await client.crm.properties.coreApi.archive(
          objectType,
          RITCHY_PLACE_ID_PROPERTY_NAME,
        )

        // Then delete the property group
        await client.crm.properties.groupsApi.archive(objectType, 'ritchy')
      } catch (error) {
        if (
          error instanceof Error &&
          'code' in error &&
          (error.code === 404 || error.code === 409)
        ) {
          logger.info({
            msg: `Property or group already deleted for ${objectType}`,
            event: 'hubspot_property_delete_success',
          })
        } else {
          throw error
        }
      }
    }
  })
}
