import type { Client } from '@hubspot/api-client'
import { logger } from '@ritchy/logger'
import { z } from 'zod'

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

export type HubspotProperty = z.infer<typeof HubspotPropertySchema>

export const getHubspotProperties = async (
  client: Client,
  objectType: 'companies' | 'contacts',
) => {
  try {
    // Get properties for the specified object type only
    const response = await client.crm.properties.coreApi.getAll(objectType)

    // Parse and validate properties
    const properties = response.results
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
