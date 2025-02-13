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

export const ensureIdempotency = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  let idempotencyKey: string

  // Check for Svix webhook ID first (Clerk)
  const svixId = req.headers['svix-id']
  if (svixId) {
    idempotencyKey = `clerk_${svixId}`
  }
  // Check for Stripe event
  else if (req.headers['stripe-signature'] && (req.body as StripeEvent)?.id) {
    const stripeEvent = req.body as StripeEvent
    // Use Stripe's event ID and request idempotency key if available
    idempotencyKey = stripeEvent.request?.idempotency_key
      ? `stripe_${stripeEvent.id}_${stripeEvent.request.idempotency_key}`
      : `stripe_${stripeEvent.id}`
  } else {
    logger.error({
      msg: 'Unsupported webhook provider',
      event: 'webhook_provider_error',
      metadata: { headers: req.headers },
    })
    res.status(400).json({
      error: 'Unsupported webhook provider',
      message: 'Only Clerk and Stripe webhooks are supported',
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
      msg: 'Duplicate webhook received',
      event: 'webhook_duplicate',
      metadata: {
        idempotencyKey,
        originalProcessedAt: existing.processedAt,
        provider: svixId
          ? 'clerk'
          : req.headers['stripe-signature']
            ? 'stripe'
            : 'unknown',
      },
    })
    res.status(200).json({ status: 'already_processed' })
    return
  }

  next()
}
