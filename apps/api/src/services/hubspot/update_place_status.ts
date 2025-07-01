import { logger } from '@ritchy/logger'
import {
  type HubspotLeadStatus,
  type InternalLeadStatus,
  LEAD_STATUS_MAPPING,
} from '@ritchy/types'
import { and } from 'drizzle-orm'
import { db } from '../../db/db'
import type { VersionContext } from '../../db/versioned_db/types'
import type { HubSpotWebhookEvent } from '../../webhook/hubspot'
import { upsertStatus } from '../places/status/upsert_status'

export const updatePlaceStatus = async ({
  tokenId,
  context,
  batchId,
  contactId,
  event,
}: {
  tokenId: string
  context: VersionContext
  batchId: string
  contactId: string
  event: HubSpotWebhookEvent
}) => {
  // Find the lead mapping record
  const leadMapping = await db.query.hubspotLeadMapping.findFirst({
    where: (mapping, { eq }) =>
      and(
        eq(mapping.hubspotContactId, contactId),
        eq(mapping.tokenId, tokenId),
      ),
  })

  if (!leadMapping) {
    logger.warn({
      msg: 'No lead mapping found for HubSpot object',
      event: 'hubspot_lead_mapping_not_found',
      metadata: {
        contactId,
        tokenId,
      },
    })
    return
  }

  // Get the user from the token
  const token = await db.query.hubspotToken.findFirst({
    where: (token, { eq }) => eq(token.id, tokenId),
  })

  if (!token) {
    logger.error({
      msg: 'No token found for HubSpot token',
      event: 'hubspot_token_not_found',
      metadata: {
        tokenId,
      },
    })
    return
  }

  // Create reverse mapping from HubSpot to internal status
  const reverseStatusMapping = Object.fromEntries(
    Object.entries(LEAD_STATUS_MAPPING).map(([internal, hubspot]) => [
      hubspot,
      internal,
    ]),
  ) as Record<HubspotLeadStatus, InternalLeadStatus>

  const newStatus =
    reverseStatusMapping[event.propertyValue as HubspotLeadStatus] ?? 'NEW'

  // Update the status using the existing upsertStatus function
  await upsertStatus(
    {
      userId: token.userId,
      sessionId: context.sessionId,
      changeSource: 'integration',
      metadata: {
        ...context.metadata,
      },
      additionalContext: {
        hubspotEvent: event,
      },
      bulkOperationId: batchId,
    },
    leadMapping.placeId,
    newStatus,
  )

  logger.info({
    msg: 'Updated place status from HubSpot webhook',
    event: 'hubspot_status_update',
    metadata: {
      placeId: leadMapping.placeId,
      userId: token.userId,
      oldStatus: event.propertyValue,
      newStatus,
    },
  })
}
