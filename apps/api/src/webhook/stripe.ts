import { logger } from '@ritchy/logger'
import { eq } from 'drizzle-orm'
import type { Request, Response } from 'express'
import Stripe from 'stripe'
import { STRIPE_CONFIG, getPlanFromProductId } from '../config/stripe'
import { db } from '../db/db'
import { subscription, user as userTable, webhookEvent } from '../db/schema'
import { sendSlackNotification } from '../external/slack/slack'
import { validateWebhookIdempotency } from '../utils/validate_webhook_idempotency'

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
      body: req.body,
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

    const { isDuplicate } = await validateWebhookIdempotency(
      req.headers,
      event,
      event.type,
    )

    if (isDuplicate) {
      res.status(200).json({ received: true, message: 'Already processed' })
      return
    }

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
    // First, determine the type of event before casting
    const eventType = event.type
    const eventObject = event.data.object

    // Log the raw event data for debugging
    logger.info({
      msg: 'Processing webhook event',
      event: 'webhook_event_received',
      metadata: {
        eventType,
        eventObject,
      },
    })

    // Check if this is a subscription-related event
    if (!eventObject || typeof eventObject !== 'object') {
      logger.warn({
        msg: 'Invalid webhook event structure',
        event: 'webhook_invalid_structure',
        metadata: { eventType },
      })
      res.status(400).json({
        error: 'Invalid webhook data',
        message: 'Invalid event structure',
      })
      return
    }

    const stripeEvent = eventObject as Stripe.Subscription

    // Check if this event has user_id in metadata
    if (!stripeEvent.metadata?.user_id) {
      logger.warn({
        msg: 'Webhook event missing user_id in metadata',
        event: 'webhook_missing_user_id',
        metadata: {
          eventType,
          webhookKey: res.locals.webhookKey,
        },
      })
      res.status(400).json({
        error: 'Invalid webhook data',
        message: 'Missing user_id in metadata',
      })
      return
    }

    const userId = stripeEvent.metadata.user_id as string
    const userResults = await db
      .select()
      .from(userTable)
      .where(eq(userTable.id, userId))

    if (!userResults || userResults.length === 0) {
      logger.error({
        msg: 'User not found for webhook',
        event: 'webhook_user_not_found',
        metadata: {
          userId,
          eventType,
        },
      })
      res.status(404).json({
        error: 'User not found',
        message: 'No user found with the provided id',
      })
      return
    }

    const user = userResults[0]

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
          switch (eventType) {
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
              // First log what we received
              logger.info({
                msg: 'Processing subscription update',
                event: 'subscription_update_started',
                metadata: {
                  subscriptionId: stripeEvent.id,
                  eventData: stripeEvent,
                },
              })

              // Safely extract the required data
              const stripeCustomerId = stripeEvent.customer as string
              const stripeSubscriptionId = stripeEvent.id
              const items = stripeEvent.items?.data

              if (
                !items ||
                items.length === 0 ||
                !items[0]?.price?.id ||
                !items[0]?.plan?.product
              ) {
                logger.warn({
                  msg: 'Missing required subscription data',
                  event: 'subscription_update_invalid_data',
                  metadata: {
                    subscriptionId: stripeSubscriptionId,
                    items: stripeEvent.items,
                  },
                })
                res.status(400).json({
                  error: 'Invalid subscription data',
                  message: 'Missing required subscription fields',
                })
                return
              }

              const stripePriceId = items[0].price.id
              const productId = items[0].plan.product as string
              const planType = getPlanFromProductId(productId)
              const status = stripeEvent.status

              // Now perform the database operation with validated data
              const result = await db
                .insert(subscription)
                .values({
                  userId,
                  stripeSubscriptionId,
                  stripePriceId,
                  stripeCustomerId,
                  status,
                  plan: planType,
                })
                .onConflictDoUpdate({
                  target: subscription.userId,
                  set: {
                    stripeSubscriptionId,
                    stripePriceId,
                    stripeCustomerId,
                    status,
                    plan: planType,
                    updatedAt: new Date(),
                  },
                })
                .returning()

              const isNewSubscription =
                result[0].createdAt.getTime() === result[0].updatedAt.getTime()

              let notificationText = ''
              if (stripeEvent.cancel_at_period_end && stripeEvent.cancel_at) {
                const cancelDate = new Date(stripeEvent.cancel_at * 1000)
                notificationText = `❌ Subscription Cancellation Scheduled\nUser: ${user.email}\nPlan: ${planType}\nWill cancel on: ${cancelDate.toLocaleDateString()}\nReason: ${stripeEvent.cancellation_details?.reason || 'Not specified'}`
              } else {
                notificationText = isNewSubscription
                  ? `🎉 New subscription!\nUser: ${user.email}\nPlan: ${planType}\nStatus: ${status}`
                  : `📝 Subscription updated\nUser: ${user.email}\nPlan: ${planType}\nStatus: ${status}`
              }

              sendSlackNotification({
                text: notificationText,
                channel: 'subscriptions',
              })
              logger.info({
                msg: stripeEvent.cancel_at_period_end
                  ? 'Subscription scheduled for cancellation'
                  : isNewSubscription
                    ? 'New subscription created'
                    : 'Subscription updated',
                event: stripeEvent.cancel_at_period_end
                  ? 'subscription_cancellation_scheduled'
                  : isNewSubscription
                    ? 'subscription_created'
                    : 'subscription_updated',
                metadata: {
                  subscriptionId: stripeSubscriptionId,
                  plan: planType,
                  status,
                  cancelAt: stripeEvent.cancel_at
                    ? new Date(stripeEvent.cancel_at * 1000)
                    : undefined,
                  cancellationReason: stripeEvent.cancellation_details?.reason,
                },
              })
              break
            }

            default: {
              logger.warn({
                msg: 'Unhandled webhook event',
                event: 'webhook_unhandled_event',
                metadata: { eventType },
              })
            }
          }

          logger.info({
            msg: 'Webhook processed successfully',
            event: 'webhook_processed',
            metadata: {
              eventType,
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
