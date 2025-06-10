import type { Client } from '@hubspot/api-client'
import { logger } from '@ritchy/logger'
import type { CompanyMapping, PlaceBase } from '@ritchy/types'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../db/db'
import {
  hubspotCompanyMapping,
  hubspotFieldMapping,
  hubspotToken,
} from '../../db/schema'
import { getPlaceDetailsV1 } from '../google_maps/place_details_V1'
import { getValidToken } from './token_manager'
import { type HubspotBase, HubspotBaseSchema } from './types'

export const createOrUpdateCompanies = async (
  placeIds: string[],
  userId: string,
  client: Client,
): Promise<HubspotBase[]> => {
  const companies: HubspotBase[] = []

  // Get the token using token manager
  const token = await getValidToken(userId)

  for (const placeId of placeIds) {
    const place = await getPlaceDetailsV1(placeId)

    const mappings = await db
      .select()
      .from(hubspotFieldMapping)
      .where(eq(hubspotFieldMapping.tokenId, token.id))

    // Transform place data using mappings
    const properties = transformPlaceData(place, mappings as CompanyMapping[])
    logger.info({
      msg: 'Transformed place data',
      event: 'hubspot_company_transform_data',
      metadata: { properties, placeId, tokenId: token.id },
    })

    // Check for existing mapping
    const existingMapping = await getCompanyMapping(placeId, token.id)

    try {
      let company: HubspotBase

      if (existingMapping.length > 0) {
        // Update existing company
        const response = await client.crm.companies.basicApi.update(
          existingMapping[0].hubspotCompanyId,
          { properties },
        )
        company = HubspotBaseSchema.parse(response)
      } else {
        // Create new company
        const response = await client.crm.companies.basicApi.create({
          properties,
        })
        company = HubspotBaseSchema.parse(response)

        // Store mapping
        await db.insert(hubspotCompanyMapping).values({
          placeId,
          hubspotCompanyId: company.id,
          tokenId: token.id,
        })
      }

      companies.push(company)
    } catch (error) {
      logger.error({
        msg: 'Failed to create/update HubSpot company',
        event: 'hubspot_company_error',
        metadata: { error, placeId, tokenId: token.id },
      })
      throw error
    }
  }

  return companies
}

const getCompanyMapping = async (placeId: string, tokenId: string) => {
  return db
    .select()
    .from(hubspotCompanyMapping)
    .where(
      and(
        eq(hubspotCompanyMapping.placeId, placeId),
        eq(hubspotCompanyMapping.tokenId, tokenId),
      ),
    )
    .limit(1)
}

function transformPlaceData(place: PlaceBase, mappings: CompanyMapping[]) {
  const properties: Record<string, string> = {}

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
