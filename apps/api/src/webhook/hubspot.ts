import crypto from 'node:crypto'
import { logger } from '@ritchy/logger'
import {
  type HubspotLeadStatus,
  type InternalLeadStatus,
  LEAD_STATUS_MAPPING,
} from '@ritchy/types'
import { eq } from 'drizzle-orm'
import type { Request, Response } from 'express'
import { HUBSPOT_CONFIG } from '../config/hubspot'
import { db } from '../db/db'
import { webhookEvent } from '../db/schema'
import { upsertStatus } from '../services/places/status/upsert_status'
import { validateWebhookIdempotency } from '../utils/validate_webhook_idempotency'

type WebhookResponse = {
  received?: boolean
  error?: string
  message?: string
}

// HubSpot webhook event types
type HubSpotWebhookEvent = {
  subscriptionType: string
  portalId: number
  appId: number
  objectId: number
  propertyName?: string
  propertyValue?: string
  changeSource: string
  eventId: string
  subscriptionId: number
  attemptNumber: number
  timestamp: number
}

/**
 * Verifies the HubSpot webhook signature
 * @param req - The request object
 * @param clientSecret - The HubSpot client secret
 * @returns boolean indicating if the signature is valid
 */
const verifyHubSpotSignature = (
  req: Request,
  clientSecret: string,
): boolean => {
  const MAX_ALLOWED_TIMESTAMP = 300000 // 5 minutes in milliseconds
  const signature = req.headers['x-hubspot-signature-v3'] as string
  const timestamp = req.headers['x-hubspot-request-timestamp'] as string
  const currentTime = Date.now()

  // Validate timestamp
  if (currentTime - Number.parseInt(timestamp) > MAX_ALLOWED_TIMESTAMP) {
    logger.error({
      msg: 'Timestamp is invalid',
      event: 'webhook_invalid_timestamp',
      metadata: { timestamp, currentTime },
    })
    return false
  }

  // Get the raw body as string - handle both Buffer and parsed JSON
  const bodyString = Buffer.isBuffer(req.body)
    ? req.body.toString('utf8')
    : JSON.stringify(req.body)

  // Use the full path including /webhook/
  const uri = HUBSPOT_CONFIG.WEBHOOK_URL
  const rawString = `${req.method}${uri}${bodyString}${timestamp}`

  // Log the exact string we're using for verification
  logger.debug({
    msg: 'HubSpot signature verification details',
    event: 'webhook_signature_debug',
    metadata: {
      method: req.method,
      uri,
      timestamp,
      bodyString,
      rawString,
      signature,
    },
  })

  // Create HMAC SHA-256 hash
  const hashedString = crypto
    .createHmac('sha256', clientSecret)
    .update(rawString)
    .digest('base64')

  const isValid = crypto.timingSafeEqual(
    Buffer.from(hashedString),
    Buffer.from(signature),
  )

  if (!isValid) {
    logger.error({
      msg: 'HubSpot signature verification failed',
      event: 'webhook_signature_mismatch',
      metadata: {
        expectedSignature: signature,
        calculatedSignature: hashedString,
        rawString,
        config: HUBSPOT_CONFIG,
        headers: req.headers,
        components: {
          method: req.method,
          uri,
          bodyString,
          timestamp,
          rawString,
        },
      },
    })
  }

  return isValid
}

export const hubspotWebhook = async (
  req: Request,
  res: Response<WebhookResponse>,
): Promise<void> => {
  // Parse the raw body to JSON
  const body = Buffer.isBuffer(req.body)
    ? JSON.parse(req.body.toString('utf8'))
    : req.body

  // Handle batch of events
  const events = Array.isArray(body) ? body : ([body] as HubSpotWebhookEvent[])

  const batchId = crypto.randomUUID()

  logger.info({
    msg: 'HubSpot webhook received',
    event: 'webhook_received',
    metadata: {
      events,
      eventCount: events.length,
      eventTypes: events.map((e) => e.subscriptionType),
      webhookKey: res.locals.webhookKey,
    },
  })

  const signature = req.headers['x-hubspot-signature-v3'] as string

  if (!signature) {
    logger.error({
      msg: 'Missing HubSpot signature header',
      event: 'webhook_missing_signature',
    })
    res.status(400).json({
      error: 'Missing signature',
      message: 'Missing X-HubSpot-Signature-v3 header',
    })
    return
  }

  try {
    const isValid = verifyHubSpotSignature(req, HUBSPOT_CONFIG.CLIENT_SECRET)

    if (!isValid) {
      logger.error({
        msg: 'Invalid HubSpot webhook signature',
        event: 'webhook_invalid_signature',
        metadata: {
          signatureHeader: signature,
        },
      })
      res.status(400).json({
        error: 'Invalid signature',
        message: 'Webhook signature verification failed',
      })
      return
    }

    // Process each event individually
    const results = await Promise.all(
      events.map(async (event) => {
        const { record, isDuplicate } = await validateWebhookIdempotency(
          req.headers,
          event,
          event.subscriptionType,
        )

        if (isDuplicate) {
          return {
            status: 'already_processed',
            eventId: event.eventId,
            webhookId: record.id,
          }
        }

        try {
          // Process the event
          switch (event.subscriptionType) {
            case 'object.propertyChange':
              if (event.propertyName === 'hs_lead_status') {
                // Find the lead mapping record
                const leadMapping = await db.query.hubspotLeadMapping.findFirst(
                  {
                    where: (mapping, { or, eq }) =>
                      or(
                        eq(mapping.hubspotCompanyId, event.objectId.toString()),
                        eq(mapping.hubspotContactId, event.objectId.toString()),
                      ),
                  },
                )

                if (!leadMapping) {
                  logger.warn({
                    msg: 'No lead mapping found for HubSpot object',
                    event: 'hubspot_lead_mapping_not_found',
                    metadata: {
                      objectId: event.objectId,
                      propertyName: event.propertyName,
                      propertyValue: event.propertyValue,
                    },
                  })
                  break
                }

                // Get the token to find the userId
                const token = await db.query.hubspotToken.findFirst({
                  where: (token, { eq }) => eq(token.id, leadMapping.tokenId),
                })

                if (!token) {
                  logger.error({
                    msg: 'No HubSpot token found for lead mapping',
                    event: 'hubspot_token_not_found',
                    metadata: {
                      leadMappingId: leadMapping.id,
                      tokenId: leadMapping.tokenId,
                    },
                  })
                  break
                }

                // Get the user from the token
                const user = await db.query.user.findFirst({
                  where: (user, { eq }) => eq(user.id, token.userId),
                })

                if (!user) {
                  logger.error({
                    msg: 'No user found for HubSpot token',
                    event: 'hubspot_user_not_found',
                    metadata: {
                      tokenId: token.id,
                      userId: token.userId,
                    },
                  })
                  break
                }

                // Create reverse mapping from HubSpot to internal status
                const reverseStatusMapping = Object.fromEntries(
                  Object.entries(LEAD_STATUS_MAPPING).map(
                    ([internal, hubspot]) => [hubspot, internal],
                  ),
                ) as Record<HubspotLeadStatus, InternalLeadStatus>

                const newStatus =
                  reverseStatusMapping[
                    event.propertyValue as HubspotLeadStatus
                  ] ?? 'NEW'

                // Update the status using the existing upsertStatus function
                await upsertStatus(
                  {
                    userId: user.id,
                    sessionId: req.auth.sessionId,
                    changeSource: 'integration',
                    metadata: {
                      ...req.metadata,
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
                    userId: user.id,
                    oldStatus: event.propertyValue,
                    newStatus,
                  },
                })
              }
              logger.info({
                msg: 'Processing object property change event',
                event: 'object_property_change_event_processing',
                metadata: {
                  event,
                },
              })
              break
            default:
              logger.info({
                msg: `Unsupported event type: ${event.subscriptionType}`,
                event: 'unsupported_event_type',
                metadata: {
                  event,
                },
              })
              break
          }
          return {
            status: 'processed',
            eventId: event.eventId,
            webhookId: record.id,
          }
        } catch (error) {
          // Update webhook record if processing failed
          await db
            .update(webhookEvent)
            .set({
              status: 'failed',
              error: error instanceof Error ? error.message : String(error),
            })
            .where(eq(webhookEvent.id, record.id))

          throw error
        }
      }),
    )

    logger.info({
      msg: 'HubSpot webhook processed',
      event: 'webhook_processed',
      metadata: {
        eventCount: events.length,
        eventTypes: events.map((e) => e.subscriptionType),
        webhookKey: res.locals.webhookKey,
        results: results.map((r) => ({
          eventId: r.eventId,
          status: r.status,
          webhookId: r.webhookId,
        })),
      },
    })

    res.json({
      received: true,
    })
  } catch (err) {
    logger.error({
      msg: 'Error processing webhook',
      event: 'webhook_processing_error',
      metadata: {
        error:
          err instanceof Error
            ? {
                message: err.message,
                name: err.name,
                stack: err.stack,
              }
            : err,
      },
    })
    res.status(500).json({
      error: 'Webhook processing failed',
      message: 'Error processing webhook',
    })
  }
}
