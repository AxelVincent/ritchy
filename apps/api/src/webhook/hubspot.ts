import crypto from 'node:crypto'
import { logger } from '@ritchy/logger'
import { eq } from 'drizzle-orm'
import type { Request, Response } from 'express'
import { HUBSPOT_CONFIG } from '../config/hubspot'
import { db } from '../db/db'
import { webhookEvent } from '../db/schema'

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
 * @param signature - The signature from the X-HubSpot-Signature-v3 header
 * @param clientSecret - The HubSpot client secret
 * @returns boolean indicating if the signature is valid
 */
const verifyHubSpotSignature = (
  req: Request,
  signature: string,
  clientSecret: string,
): boolean => {
  const MAX_ALLOWED_TIMESTAMP = 300000 // 5 minutes in milliseconds
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

  // Concatenate request method, URI, body, and header timestamp
  const uri = `https://${req.hostname}${req.url}`
  const rawString = `${req.method}${uri}${JSON.stringify(req.body)}${timestamp}`

  // Create HMAC SHA-256 hash
  const hashedString = crypto
    .createHmac('sha256', clientSecret)
    .update(rawString)
    .digest('base64')

  return crypto.timingSafeEqual(
    Buffer.from(hashedString),
    Buffer.from(signature),
  )
}

export const hubspotWebhook = async (
  req: Request,
  res: Response<WebhookResponse>,
): Promise<void> => {
  logger.info({
    msg: 'HubSpot webhook received',
    event: 'webhook_received',
    metadata: {
      eventType: req.body?.subscriptionType,
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
    const isValid = verifyHubSpotSignature(
      req,
      signature,
      HUBSPOT_CONFIG.CLIENT_SECRET,
    )

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

    logger.info({
      msg: 'Webhook signature verified successfully',
      event: 'webhook_signature_verified',
      metadata: {
        eventType: req.body?.subscriptionType,
        webhookKey: res.locals.webhookKey,
      },
    })

    const [webhookRecord] = await db
      .insert(webhookEvent)
      .values({
        type: req.body?.subscriptionType,
        service: 'hubspot',
        payload: req.body,
        idempotencyKey: res.locals.webhookKey,
        status: 'processed',
        processedAt: new Date(),
      })
      .returning()

    logger.info({
      msg: 'Webhook record created',
      event: 'webhook_record_created',
      metadata: {
        webhookId: webhookRecord.id,
        eventType: req.body?.subscriptionType,
        webhookKey: res.locals.webhookKey,
      },
    })

    try {
      const event = req.body as HubSpotWebhookEvent

      // Process different types of HubSpot webhook events
      switch (event.subscriptionType) {
        case 'contact.creation':
        case 'contact.propertyChange':
        case 'contact.deletion': {
          logger.info({
            msg: 'Processing contact event',
            event: 'contact_event_processing',
            metadata: {
              eventType: event.subscriptionType,
              objectId: event.objectId,
              propertyName: event.propertyName,
              propertyValue: event.propertyValue,
            },
          })
          // TODO: Implement contact event handling
          // This could include:
          // - Syncing contact data with your database
          // - Triggering notifications
          // - Updating related records
          break
        }

        case 'company.creation':
        case 'company.propertyChange':
        case 'company.deletion': {
          logger.info({
            msg: 'Processing company event',
            event: 'company_event_processing',
            metadata: {
              eventType: event.subscriptionType,
              objectId: event.objectId,
              propertyName: event.propertyName,
              propertyValue: event.propertyValue,
            },
          })
          // TODO: Implement company event handling
          // This could include:
          // - Syncing company data with your database
          // - Updating related contacts
          // - Triggering notifications
          break
        }

        case 'deal.creation':
        case 'deal.propertyChange':
        case 'deal.deletion': {
          logger.info({
            msg: 'Processing deal event',
            event: 'deal_event_processing',
            metadata: {
              eventType: event.subscriptionType,
              objectId: event.objectId,
              propertyName: event.propertyName,
              propertyValue: event.propertyValue,
            },
          })
          // TODO: Implement deal event handling
          // This could include:
          // - Syncing deal data with your database
          // - Updating related contacts/companies
          // - Triggering notifications
          break
        }

        default: {
          logger.warn({
            msg: 'Unhandled HubSpot webhook event',
            event: 'webhook_unhandled_event',
            metadata: { eventType: event.subscriptionType },
          })
        }
      }

      logger.info({
        msg: 'Webhook processed successfully',
        event: 'webhook_processed',
        metadata: {
          eventType: event.subscriptionType,
          webhookKey: res.locals.webhookKey,
        },
      })

      res.json({ received: true })
    } catch (processingError) {
      await db
        .update(webhookEvent)
        .set({
          status: 'failed',
          error:
            processingError instanceof Error
              ? processingError.message
              : String(processingError),
        })
        .where(eq(webhookEvent.id, webhookRecord.id))

      throw processingError
    }
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
