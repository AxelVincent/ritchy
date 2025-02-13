import { logger } from '@ritchy/logger'
import { eq } from 'drizzle-orm'
import type { Request, Response } from 'express'
import Stripe from 'stripe'
import { STRIPE_CONFIG, getPlanFromProductId } from '../config/stripe'
import { db } from '../db/db'
import { subscription, webhookEvent } from '../db/schema'

const stripe = new Stripe(STRIPE_CONFIG.API_KEYS.SECRET_KEY, {
  apiVersion: '2025-01-27.acacia',
})

type WebhookResponse = {
  received?: boolean
  error?: string
  message?: string
}

export const stripeWebhook = async (
  req: Request,
  res: Response<WebhookResponse>,
): Promise<void> => {
  let event: Stripe.Event
  try {
    const signature = req.headers['stripe-signature']

    if (!signature) {
      logger.error({
        msg: 'Missing stripe-signature header',
        event: 'webhook_missing_signature',
      })
      res.status(400).json({
        error: 'Missing signature',
        message: 'Missing stripe-signature header',
      })
      return
    }

    event = stripe.webhooks.constructEvent(
      req.rawBody,
      signature,
      STRIPE_CONFIG.API_KEYS.WEBHOOK_SECRET,
    )
  } catch (err) {
    logger.error({
      msg: 'Webhook signature verification failed',
      event: 'webhook_invalid_signature',
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
    res.status(400).json({
      error: 'Invalid signature',
      message: 'Webhook signature verification failed',
    })
    return
  }

  try {
    const stripeEvent = event.data.object as Stripe.Subscription

    const [webhookRecord] = await db
      .insert(webhookEvent)
      .values({
        type: event.type,
        service: 'stripe',
        payload: event.data,
        idempotencyKey: res.locals.webhookKey,
        status: 'processed',
      })
      .returning()

    try {
      switch (event.type) {
        case 'customer.subscription.trial_will_end': {
          logger.info({
            msg: 'Trial ending for subscription',
            event: 'subscription_trial_ending',
            user: {
              id: stripeEvent.metadata.user_id,
            },
            metadata: { subscriptionId: stripeEvent.id },
          })
          break
        }

        case 'customer.subscription.deleted': {
          await db
            .update(subscription)
            .set({
              status: stripeEvent.status,
              plan: 'FREE',
              updatedAt: new Date(),
            })
            .where(eq(subscription.stripeSubscriptionId, stripeEvent.id))
          logger.info({
            msg: 'Subscription deleted',
            event: 'subscription_deleted',
            user: {
              id: stripeEvent.metadata.user_id,
            },
            metadata: { subscriptionId: stripeEvent.id },
          })
          break
        }

        case 'customer.subscription.updated': {
          await db
            .insert(subscription)
            .values({
              userId: stripeEvent.metadata.user_id,
              stripeSubscriptionId: stripeEvent.id,
              stripePriceId: stripeEvent.items.data[0].price.id,
              stripeCustomerId: stripeEvent.customer as string,
              status: stripeEvent.status,
              plan: getPlanFromProductId(
                stripeEvent.items.data[0].plan.product as string,
              ),
            })
            .onConflictDoUpdate({
              target: subscription.stripeSubscriptionId,
              set: {
                stripePriceId: stripeEvent.items.data[0].price.id,
                status: stripeEvent.status,
                plan: getPlanFromProductId(
                  stripeEvent.items.data[0].plan.product as string,
                ),
                updatedAt: new Date(),
              },
            })
          logger.info({
            msg: 'Subscription created/updated',
            event: 'subscription_created',
            user: {
              id: stripeEvent.metadata.user_id,
            },
            metadata: { subscriptionId: stripeEvent.id, stripeEvent },
          })
          break
        }

        default: {
          logger.warn({
            msg: 'Unhandled webhook event',
            event: 'webhook_unhandled_event',
            user: {
              id: stripeEvent.metadata.user_id,
            },
            metadata: { eventType: event.type },
          })
        }
      }

      res.json({ received: true })
      return
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
    return
  }
}
