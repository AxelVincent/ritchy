import { logger } from '@ritchy/logger'
import {
  type CompanyField,
  CompanyFieldEnum,
  type DEFAULT_COMPANY_FIELDS,
  FIELD_CONFIGS,
  type GetCompanyMappingsResponse,
  type GetCompanyPropertiesResponse,
} from '@ritchy/types'
import { getHubspotProperties } from 'apps/api/src/external/hubspot/properties'
import { withHubspotClient } from 'apps/api/src/external/hubspot/token_manager'
import { getHubspotToken } from 'apps/api/src/services/hubspot/get_hubspot_token'
import { and, eq, inArray, sql } from 'drizzle-orm'
import type { Request, Response } from 'express'
import { db } from '../../../db/db'
import { hubspotCompanyMapping, hubspotFieldMapping } from '../../../db/schema'

type CompanyMapping = {
  tokenId: string
  internalField: CompanyField
  hubspotField: string
}

const createDefaultMappings = (tokenId: string): CompanyMapping[] =>
  Object.entries(FIELD_CONFIGS.company).map(([field, config]) => ({
    tokenId,
    internalField: `company.${field}` as CompanyField,
    hubspotField: config.defaultHubspotField,
  }))

export const getCompanyProperties = async (
  req: Request,
  res: Response<GetCompanyPropertiesResponse>,
) => {
  try {
    const properties = await withHubspotClient(
      req.auth.userId,
      async (client) => {
        const allProperties = await getHubspotProperties(client, 'companies')
        return {
          companyProperties: allProperties.properties.map((prop) => ({
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
      msg: 'Failed to fetch HubSpot company properties',
      event: 'hubspot_company_properties_fetch_error',
      metadata: { error, userId: req.auth.userId },
    })
    res.status(500).json({ error: 'Failed to fetch company properties' })
  }
}

export const getCompanyMappings = async (
  req: Request,
  res: Response<GetCompanyMappingsResponse>,
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

    const mappings = (
      await db
        .select()
        .from(hubspotFieldMapping)
        .where(
          and(
            eq(hubspotFieldMapping.tokenId, token.id),
            inArray(
              hubspotFieldMapping.internalField,
              CompanyFieldEnum.options,
            ),
          ),
        )
    ).map((m) => ({
      ...m,
      internalField: m.internalField as keyof typeof DEFAULT_COMPANY_FIELDS,
    }))

    // If no mappings exist, create default ones
    if (mappings.length === 0) {
      const defaultMappings = createDefaultMappings(token.id)
      await db.insert(hubspotFieldMapping).values(defaultMappings)
      // Now select again
      const newMappings = await db
        .select()
        .from(hubspotFieldMapping)
        .where(
          and(
            eq(hubspotFieldMapping.tokenId, token.id),
            inArray(
              hubspotFieldMapping.internalField,
              CompanyFieldEnum.options,
            ),
          ),
        )
      const companyOnlyMappings = newMappings.map((m) => ({
        ...m,
        internalField: m.internalField as keyof typeof DEFAULT_COMPANY_FIELDS,
      }))
      res.json(companyOnlyMappings)
      return
    }

    res.json(mappings)
  } catch (error) {
    logger.error({
      msg: 'Failed to get company mappings',
      event: 'hubspot_company_mappings_get_error',
      metadata: { error, userId: req.auth?.userId },
    })
    res.status(500).json([])
  }
}

export const updateCompanyMapping = async (
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
          eq(
            hubspotFieldMapping.internalField,
            internalField as keyof typeof DEFAULT_COMPANY_FIELDS,
          ),
        ),
      )
      .returning()

    res.json(updatedMapping)
  } catch (error) {
    logger.error({
      msg: 'Failed to update company mapping',
      event: 'hubspot_company_mapping_update_error',
      metadata: { error, userId: req.auth?.userId },
    })
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const resetCompanyMappings = async (
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
      msg: 'Failed to reset company mappings',
      event: 'hubspot_company_mappings_reset_error',
      metadata: { error, userId: req.auth?.userId },
    })
    res.status(500).json({ error: 'Internal server error' })
  }
}
