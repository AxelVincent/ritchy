import { logger } from '@ritchy/logger'
import { eq } from 'drizzle-orm'
import type { Request, Response } from 'express'
import Stripe from 'stripe'
import { STRIPE_CONFIG, getPlanFromProductId } from '../config/stripe'
import { db } from '../db/db'
import { subscription, user as userTable, webhookEvent } from '../db/schema'

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
  logger.info({
    msg: 'Stripe webhook received',
    event: 'webhook_received',
    metadata: {
      eventType: req.body?.type,
      webhookKey: res.locals.webhookKey,
    },
  })

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

    logger.info({
      msg: 'Webhook signature verified successfully',
      event: 'webhook_signature_verified',
      metadata: {
        eventType: event.type,
        webhookKey: res.locals.webhookKey,
      },
    })
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
    const [user] = await db
      .select()
      .from(userTable)
      .where(eq(userTable.id, stripeEvent.metadata.user_id as string))

    await logger.runWithContext(
      {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName ?? '',
          lastName: user.lastName ?? '',
        },
      },
      async () => {
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

        logger.info({
          msg: 'Webhook record created',
          event: 'webhook_record_created',
          metadata: {
            webhookId: webhookRecord.id,
            eventType: event.type,
            webhookKey: res.locals.webhookKey,
          },
        })

        try {
          switch (event.type) {
            case 'customer.subscription.trial_will_end': {
              logger.info({
                msg: 'Trial ending for subscription',
                event: 'subscription_trial_ending',
                metadata: {
                  subscriptionId: stripeEvent.id,
                  trialEnd: stripeEvent.trial_end,
                  daysUntilTrialEnd: stripeEvent.trial_end
                    ? Math.floor(
                        (stripeEvent.trial_end - Date.now() / 1000) / 86400,
                      )
                    : null,
                },
              })
              break
            }

            case 'customer.subscription.deleted': {
              logger.info({
                msg: 'Processing subscription deletion',
                event: 'subscription_deletion_started',
                metadata: {
                  subscriptionId: stripeEvent.id,
                  currentStatus: stripeEvent.status,
                  cancelReason: stripeEvent.cancellation_details?.reason,
                },
              })

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
                metadata: { subscriptionId: stripeEvent.id },
              })
              break
            }

            case 'customer.subscription.updated': {
              logger.info({
                msg: 'Processing subscription update',
                event: 'subscription_update_started',
                metadata: {
                  subscriptionId: stripeEvent.id,
                  newPriceId: stripeEvent.items.data[0].price.id,
                  newStatus: stripeEvent.status,
                  newPlan: getPlanFromProductId(
                    stripeEvent.items.data[0].plan.product as string,
                  ),
                },
              })

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
                metadata: { subscriptionId: stripeEvent.id, stripeEvent },
              })
              break
            }

            default: {
              logger.warn({
                msg: 'Unhandled webhook event',
                event: 'webhook_unhandled_event',
                metadata: { eventType: event.type },
              })
            }
          }

          logger.info({
            msg: 'Webhook processed successfully',
            event: 'webhook_processed',
            metadata: {
              eventType: event.type,
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
      },
    )
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
