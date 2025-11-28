import type { IncomingHttpHeaders } from 'node:http'
import { logger } from '@ritchy/logger'
import { eq } from 'drizzle-orm'
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

interface IdempotencyResult {
  idempotencyKey: string
  provider: 'clerk' | 'stripe'
}

/**
 * Determines the webhook provider from headers
 */
const getWebhookProvider = (
  headers: IncomingHttpHeaders,
): 'clerk' | 'stripe' => {
  if (headers['svix-id']) return 'clerk'
  if (headers['stripe-signature']) return 'stripe'
  throw new Error('Unsupported webhook provider')
}

/**
 * Generates idempotency key for a single event
 */
const generateIdempotencyKey = (
  headers: IncomingHttpHeaders,
  event: unknown,
): IdempotencyResult => {
  const provider = getWebhookProvider(headers)

  switch (provider) {
    case 'clerk': {
      const svixId = headers['svix-id']
      if (!svixId) throw new Error('Missing svix-id header')
      return {
        idempotencyKey: `clerk_${svixId}`,
        provider,
      }
    }

    case 'stripe': {
      const stripeEvent = event as StripeEvent
      if (!stripeEvent?.id) {
        throw new Error('Invalid Stripe event: Missing event id')
      }
      return {
        idempotencyKey: stripeEvent.request?.idempotency_key
          ? `stripe_${stripeEvent.id}_${stripeEvent.request.idempotency_key}`
          : `stripe_${stripeEvent.id}`,
        provider,
      }
    }
  }
}

/**
 * Creates a webhook record and checks idempotency for a single event
 */
export const validateWebhookIdempotency = async (
  headers: IncomingHttpHeaders,
  event: unknown,
  type: string,
) => {
  const { idempotencyKey, provider } = generateIdempotencyKey(headers, event)

  const existing = await db.query.webhookEvent.findFirst({
    where: eq(webhookEvent.idempotencyKey, idempotencyKey),
  })

  if (existing) {
    logger.info({
      msg: 'Event already processed',
      event: 'webhook_duplicate',
      metadata: {
        idempotencyKey,
        eventType: type,
        processedAt: existing.processedAt,
        provider,
      },
    })
    return { record: existing, isDuplicate: true, provider }
  }

  const [webhookRecord] = await db
    .insert(webhookEvent)
    .values({
      type,
      service: provider,
      payload: event,
      idempotencyKey,
      status: 'processed',
      processedAt: new Date(),
    })
    .returning()

  logger.info({
    msg: 'Webhook record created',
    event: 'webhook_record_created',
    metadata: {
      webhookId: webhookRecord.id,
      eventType: type,
      idempotencyKey,
      provider,
    },
  })

  return {
    record: webhookRecord,
    idempotencyKey,
    isDuplicate: false,
    provider,
  }
}
