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
import { hubspotLeadMapping, webhookEvent } from '../db/schema'
import { clearContactMapping } from '../services/hubspot/clear_contact_mapping'
import { deleteCompanyMapping } from '../services/hubspot/delete_company_mapping'
import { getHubspotTokenByPortalId } from '../services/hubspot/queries/get_hubspot_token_by_portal_id'
import { updatePlaceStatus } from '../services/hubspot/update_place_status'
import { upsertStatus } from '../services/places/status/upsert_status'
import { validateWebhookIdempotency } from '../utils/validate_webhook_idempotency'

type WebhookResponse = {
  received?: boolean
  error?: string
  message?: string
}

// HubSpot webhook event types
export type HubSpotWebhookEvent = {
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
  // Temporary bypass for development
  if (process.env.NODE_ENV === 'development') {
    logger.warn({
      msg: 'SKIPPING signature verification in development mode',
      event: 'webhook_signature_bypass',
    })
    return true
  }
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
        if (event.changeSource === 'INTEGRATION') {
          return {
            status: 'skipped',
            eventId: event.eventId,
            webhookId: event.eventId,
          }
        }

        const token = await getHubspotTokenByPortalId(event.portalId.toString())
        if (!token) {
          logger.error({
            msg: 'No HubSpot token found for portal',
            event: 'hubspot_token_not_found',
            metadata: { portalId: event.portalId },
          })
          return {
            status: 'token_not_found',
            eventId: event.eventId,
            webhookId: event.eventId,
          }
        }

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
                await updatePlaceStatus({
                  tokenId: token.id,
                  context: {
                    userId: token.userId,
                    sessionId: req.auth.sessionId,
                    changeSource: 'integration',
                    metadata: {
                      timestamp: new Date(),
                      ipAddress: req.ip ?? '',
                      userAgent: String(req.headers['user-agent'] ?? ''),
                      requestId: String(req.headers['x-request-id'] ?? ''),
                    },
                  },
                  batchId,
                  contactId: event.objectId.toString(),
                  event,
                })
                logger.info({
                  msg: 'Processing object property change event',
                  event: 'object_property_change_event_processing',
                  metadata: {
                    event,
                  },
                })
              }
              break
            case 'company.deletion': {
              await deleteCompanyMapping(event.objectId.toString(), token.id)
              break
            }
            case 'contact.deletion':
              await clearContactMapping(event.objectId.toString(), token.id, '')
              logger.info({
                msg: 'Processing contact deletion event',
                event: 'contact_deletion_event_processing',
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
