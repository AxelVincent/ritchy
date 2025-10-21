import { logger } from '@ritchy/logger'
import { eq } from 'drizzle-orm'
import type { Request, Response } from 'express'
import Stripe from 'stripe'
import { STRIPE_CONFIG } from '../config/stripe'
import { db } from '../db/db'
import { subscription, user as userTable } from '../db/schema'
import { sendSlackNotification } from '../external/slack/slack'
import { createOrUpdateSubscription } from '../services/payment/create_or_update_subscription'
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
        logger.info({
          msg: 'Processing webhook event',
          event: 'webhook_event_processing',
          metadata: {
            eventType: event.type,
          },
        })

        // Remove the try-catch block entirely
        switch (eventType) {
          case 'customer.subscription.created': {
            logger.info({
              msg: 'Processing subscription creation',
              event: 'subscription_creation_started',
              metadata: {
                subscriptionId: stripeEvent.id,
                status: stripeEvent.status,
              },
            })

            // Only activate subscription if it's already active (100% coupon case)
            // For regular subscriptions with payment required, we'll wait for subscription.updated after payment
            if (stripeEvent.status !== 'active') {
              logger.info({
                msg: 'Subscription not active yet, skipping immediate activation',
                event: 'subscription_creation_pending_payment',
                metadata: {
                  subscriptionId: stripeEvent.id,
                  status: stripeEvent.status,
                },
              })
              break
            }

            // Create subscription record with active status (100% coupon or trial)
            try {
              const { planType, isNew } = await createOrUpdateSubscription(
                stripeEvent,
                userId,
              )

              sendSlackNotification({
                text: `🎉 New subscription activated immediately!\nUser: ${user.email}\nPlan: ${planType}\nStatus: active (100% discount or free trial)`,
                channel: 'subscriptions',
              })

              logger.info({
                msg: 'Subscription created and activated immediately',
                event: 'subscription_created_active',
                metadata: {
                  subscriptionId: stripeEvent.id,
                  plan: planType,
                  status: 'active',
                  isNew,
                },
              })
            } catch (err) {
              logger.error({
                msg: 'Error creating subscription',
                event: 'subscription_creation_error',
                metadata: {
                  subscriptionId: stripeEvent.id,
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
                error: 'Invalid subscription data',
                message:
                  err instanceof Error ? err.message : 'Unknown error occurred',
              })
              return
            }
            break
          }

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
                status: stripeEvent.status,
                cancelAtPeriodEnd: stripeEvent.cancel_at_period_end,
              },
            })

            // Handle cancellation scheduling
            if (stripeEvent.cancel_at_period_end && stripeEvent.cancel_at) {
              const cancelDate = new Date(stripeEvent.cancel_at * 1000)

              // Update subscription status to reflect cancellation schedule
              await db
                .update(subscription)
                .set({
                  status: stripeEvent.status,
                  updatedAt: new Date(),
                })
                .where(eq(subscription.stripeSubscriptionId, stripeEvent.id))

              sendSlackNotification({
                text: `❌ Subscription Cancellation Scheduled\nUser: ${user.email}\nSubscription: ${stripeEvent.id}\nWill cancel on: ${cancelDate.toLocaleDateString()}\nReason: ${stripeEvent.cancellation_details?.reason || 'Not specified'}`,
                channel: 'subscriptions',
              })

              logger.info({
                msg: 'Subscription scheduled for cancellation',
                event: 'subscription_cancellation_scheduled',
                metadata: {
                  subscriptionId: stripeEvent.id,
                  cancelAt: cancelDate,
                  cancellationReason: stripeEvent.cancellation_details?.reason,
                },
              })
              break
            }

            // Handle subscription updates (plan changes, status changes after payment, etc.)
            try {
              const { planType, isNew } = await createOrUpdateSubscription(
                stripeEvent,
                userId,
              )

              const notificationText = isNew
                ? `🎉 New subscription!\nUser: ${user.email}\nPlan: ${planType}\nStatus: ${stripeEvent.status}`
                : `📝 Subscription updated\nUser: ${user.email}\nPlan: ${planType}\nStatus: ${stripeEvent.status}`

              sendSlackNotification({
                text: notificationText,
                channel: 'subscriptions',
              })

              logger.info({
                msg: isNew
                  ? 'New subscription created'
                  : 'Subscription updated',
                event: isNew ? 'subscription_created' : 'subscription_updated',
                metadata: {
                  subscriptionId: stripeEvent.id,
                  plan: planType,
                  status: stripeEvent.status,
                  isNew,
                },
              })
            } catch (err) {
              logger.error({
                msg: 'Error updating subscription',
                event: 'subscription_update_error',
                metadata: {
                  subscriptionId: stripeEvent.id,
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
                error: 'Invalid subscription data',
                message:
                  err instanceof Error ? err.message : 'Unknown error occurred',
              })
              return
            }
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
