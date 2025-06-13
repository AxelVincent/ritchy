import { logger } from '@ritchy/logger'
import { eq } from 'drizzle-orm'
import type { NextFunction, Request, Response } from 'express'
import { db } from '../db/db'
import { webhookEvent } from '../db/schema'

interface StripeRequest {
  id: string
  idempotency_key?: string
}

interface StripeEvent {
  id: string
  type: string
  request?: StripeRequest
}

// Updated to match exact HubSpot webhook payload from logs
interface HubSpotEvent {
  eventId: number
  subscriptionId: number
  portalId: number
  appId: number
  occurredAt: number
  subscriptionType: string
  attemptNumber: number
  objectId: number
  objectTypeId: string
  changeFlag?: 'CREATED' | 'UPDATED' | 'DELETED'
  changeSource: 'INTEGRATION' | string
  sourceId: string
  propertyName?: string
  propertyValue?: string
  isSensitive?: boolean
}

export const idempotency = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  let idempotencyKey: string
  let provider: string

  // Check for Svix webhook ID first (Clerk)
  const svixId = req.headers['svix-id']
  if (svixId) {
    idempotencyKey = `clerk_${svixId}`
    provider = 'clerk'
  }
  // Check for HubSpot webhook
  else if (req.headers['x-hubspot-signature-v3']) {
    // Parse body if it's raw
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body

    // Handle both single event and batch events
    const events = Array.isArray(body) ? body : [body]

    if (!events.length || !events[0]?.eventId) {
      logger.error({
        msg: 'Invalid HubSpot webhook payload',
        event: 'webhook_invalid_payload',
        metadata: { body },
      })
      res.status(400).json({
        error: 'Invalid webhook payload',
        message: 'Missing eventId in HubSpot webhook payload',
      })
      return
    }

    // For batch events, we'll use the first event's ID as the idempotency key
    // This ensures we process the batch only once
    const firstEvent = events[0] as HubSpotEvent
    idempotencyKey = `hubspot_batch_${firstEvent.eventId}`
    provider = 'hubspot'

    // Store the full batch in res.locals for the webhook handler
    res.locals.hubspotEvents = events

    logger.info({
      msg: 'HubSpot webhook batch received',
      event: 'webhook_batch_received',
      metadata: {
        eventCount: events.length,
        eventTypes: events.map((e) => e.subscriptionType),
        firstEventId: firstEvent.eventId,
        idempotencyKey,
      },
    })
  }
  // Check for Stripe event
  else if (req.headers['stripe-signature'] && (req.body as StripeEvent)?.id) {
    const stripeEvent = req.body as StripeEvent
    // Use Stripe's event ID and request idempotency key if available
    idempotencyKey = stripeEvent.request?.idempotency_key
      ? `stripe_${stripeEvent.id}_${stripeEvent.request.idempotency_key}`
      : `stripe_${stripeEvent.id}`
    provider = 'stripe'
  } else {
    logger.error({
      msg: 'Unsupported webhook provider',
      event: 'webhook_provider_error',
      metadata: {
        headers: req.headers,
        contentType: req.headers['content-type'],
        hasHubspotSignature: !!req.headers['x-hubspot-signature-v3'],
      },
    })
    res.status(400).json({
      error: 'Unsupported webhook provider',
      message: 'Only Clerk, HubSpot, and Stripe webhooks are supported',
    })
    return
  }

  // Store the generated key for use in subsequent middleware/handlers
  res.locals.webhookKey = idempotencyKey

  // Check for existing webhook
  const existing = await db.query.webhookEvent.findFirst({
    where: eq(webhookEvent.idempotencyKey, idempotencyKey),
  })

  if (existing) {
    logger.info({
      msg: 'Duplicate webhook batch received',
      event: 'webhook_duplicate',
      metadata: {
        idempotencyKey,
        originalProcessedAt: existing.processedAt,
        provider,
        eventCount: res.locals.hubspotEvents?.length,
        eventTypes: res.locals.hubspotEvents?.map(
          (e: HubSpotEvent) => e.subscriptionType,
        ),
      },
    })
    res.status(200).json({ status: 'already_processed' })
    return
  }

  next()
}
