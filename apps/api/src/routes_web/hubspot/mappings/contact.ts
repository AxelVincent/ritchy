import { logger } from '@ritchy/logger'
import {
  type ContactField,
  ContactFieldEnum,
  FIELD_CONFIGS,
  type FieldConfig,
  type GetContactMappingsResponse,
  type GetContactPropertiesResponse,
  type StatusField,
  StatusFieldEnum,
} from '@ritchy/types'
import { getHubspotProperties } from 'apps/api/src/external/hubspot/properties'
import { withHubspotClient } from 'apps/api/src/external/hubspot/token_manager'
import { getHubspotToken } from 'apps/api/src/services/hubspot/get_hubspot_token'
import { and, eq, inArray, sql } from 'drizzle-orm'
import type { Request, Response } from 'express'
import { db } from '../../../db/db'
import { hubspotFieldMapping, hubspotToken } from '../../../db/schema'

type ContactMapping = {
  id: string
  tokenId: string
  internalField: ContactField | StatusField
  hubspotField: string
  createdAt: Date
  updatedAt: Date
}

type ContactMappingInput = {
  tokenId: string
  internalField: ContactField | StatusField
  hubspotField: string
  createdAt: Date
  updatedAt: Date
}

export const createDefaultMappings = (
  tokenId: string,
): ContactMappingInput[] => [
  // Contact fields
  ...Object.entries(FIELD_CONFIGS.contact).map(([field, config]) => ({
    tokenId,
    internalField: `contact.${field}` as ContactField,
    hubspotField: config.defaultHubspotField,
    createdAt: new Date(),
    updatedAt: new Date(),
  })),
  // Status fields
  ...Object.entries(FIELD_CONFIGS.status).map(([field, config]) => ({
    tokenId,
    internalField: `status.${field}` as StatusField,
    hubspotField: config.defaultHubspotField,
    createdAt: new Date(),
    updatedAt: new Date(),
  })),
]

export const getContactProperties = async (
  req: Request,
  res: Response<GetContactPropertiesResponse>,
) => {
  try {
    const properties = await withHubspotClient(
      req.auth.userId,
      async (client) => {
        const allProperties = await getHubspotProperties(client, 'contacts')
        return {
          contactProperties: allProperties.properties.map((prop) => ({
            ...prop,
            hubspotDefined: prop.hubspotDefined ?? false,
            calculated: prop.calculated ?? false,
            hasUniqueValue: prop.hasUniqueValue ?? false,
            archived: prop.archived ?? false,
            options: prop.options?.map((opt) => ({
              label: opt.label,
              value: opt.value,
            })),
          })),
        }
      },
    )
    res.json(properties)
  } catch (error) {
    logger.error({
      msg: 'Failed to fetch HubSpot contact properties',
      event: 'hubspot_contact_properties_fetch_error',
      metadata: { error, userId: req.auth.userId },
    })
    res.status(500).json({ error: 'Failed to fetch contact properties' })
  }
}

export const getContactMappings = async (
  req: Request,
  res: Response<GetContactMappingsResponse>,
): Promise<void> => {
  try {
    const userId = req.auth?.userId
    if (!userId) {
      res.status(401).json([])
      return
    }

    const token = await getHubspotToken(userId)
    if (!token) {
      res.status(404).json([])
      return
    }

    const mappings = (await db
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
      )) as ContactMapping[]

    // If no mappings exist, create default ones
    if (mappings.length === 0) {
      const defaultMappings = createDefaultMappings(token.id)
      await db.insert(hubspotFieldMapping).values(defaultMappings).returning()
      const createdMappings = (await db
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
        )) as ContactMapping[]

      res.json(createdMappings)
      return
    }

    res.json(mappings)
  } catch (error) {
    logger.error({
      msg: 'Failed to get contact mappings',
      event: 'hubspot_contact_mappings_get_error',
      metadata: { error, userId: req.auth?.userId },
    })
    res.status(500).json([])
  }
}

export const updateContactMapping = async (
  req: Request<{ internalField: string; hubspotField: string }>,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.auth?.userId
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    const { internalField, hubspotField } = req.body
    if (!internalField || !hubspotField) {
      res.status(400).json({ error: 'Missing required fields' })
      return
    }

    const token = await getHubspotToken(userId)

    if (!token) {
      res.status(404).json({ error: 'No HubSpot token found' })
      return
    }

    const [updatedMapping] = await db
      .update(hubspotFieldMapping)
      .set({
        hubspotField,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(hubspotFieldMapping.tokenId, token.id),
          eq(hubspotFieldMapping.internalField, internalField as ContactField),
        ),
      )
      .returning()

    res.json(updatedMapping)
  } catch (error) {
    logger.error({
      msg: 'Failed to update contact mapping',
      event: 'hubspot_contact_mapping_update_error',
      metadata: { error, userId: req.auth?.userId },
    })
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const resetContactMappings = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.auth?.userId
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    const token = await getHubspotToken(userId)

    if (!token) {
      res.status(404).json({ error: 'No HubSpot token found' })
      return
    }

    const defaultMappings = createDefaultMappings(token.id)

    await db
      .insert(hubspotFieldMapping)
      .values(defaultMappings)
      .onConflictDoUpdate({
        target: [
          hubspotFieldMapping.tokenId,
          hubspotFieldMapping.internalField,
        ],
        set: {
          hubspotField: sql`EXCLUDED.hubspot_field`,
          updatedAt: new Date(),
        },
      })

    res.json({ success: true })
  } catch (error) {
    logger.error({
      msg: 'Failed to reset contact mappings',
      event: 'hubspot_contact_mappings_reset_error',
      metadata: { error, userId: req.auth?.userId },
    })
    res.status(500).json({ error: 'Internal server error' })
  }
}
