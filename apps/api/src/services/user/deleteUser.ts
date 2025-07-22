import { logger } from '@ritchy/logger'
import { eq } from 'drizzle-orm'
import Stripe from 'stripe'
import { STRIPE_CONFIG } from '../../config/stripe'
import { db } from '../../db/db'
import { subscription, user } from '../../db/schema'
import type { ClerkUserData } from '../../webhook/clerk'

const stripe = new Stripe(STRIPE_CONFIG.API_KEYS.SECRET_KEY, {
  apiVersion: '2025-01-27.acacia'
})

export const deleteUser = async (userData: ClerkUserData) => {
  logger.info({
    msg: 'Processing user deletion',
    event: 'user_deletion_started',
    metadata: { clerkId: userData.clerkId }
  })

  try {
    const [userWithSubscription] = await db
      .select({
        user: user,
        sub: subscription
      })
      .from(user)
      .leftJoin(subscription, eq(user.id, subscription.userId))
      .where(eq(user.clerkId, userData.clerkId))

    if (userWithSubscription?.sub?.stripeSubscriptionId) {
      const subscriptionId = userWithSubscription.sub.stripeSubscriptionId

      logger.info({
        msg: 'Cancelling Stripe subscription before user deletion',
        event: 'subscription_cancel_started',
        metadata: {
          clerkId: userData.clerkId,
          subscriptionId,
          userId: userWithSubscription.user.id
        }
      })

      try {
        await stripe.subscriptions.cancel(subscriptionId, {
          invoice_now: true,
          prorate: false
        })

        logger.info({
          msg: 'Stripe subscription cancelled successfully',
          event: 'subscription_cancelled',
          metadata: {
            clerkId: userData.clerkId,
            subscriptionId
          }
        })
      } catch (stripeError) {
        logger.error({
          msg: 'Failed to cancel Stripe subscription',
          event: 'subscription_cancel_failed',
          metadata: {
            clerkId: userData.clerkId,
            userId: userWithSubscription.user.id,
            subscriptionId,
            error:
              stripeError instanceof Error
                ? stripeError.message
                : String(stripeError)
          }
        })
      }
    }

    if (userWithSubscription?.sub?.stripeCustomerId) {
      const customerId = userWithSubscription.sub.stripeCustomerId

      try {
        await stripe.customers.update(customerId, {
          email: userWithSubscription.user.email,
          name: `${userWithSubscription.user.firstName} ${userWithSubscription.user.lastName}`,
          description: `User deleted their account on ${new Date().toISOString()}`,
          metadata: {
            user_id: userWithSubscription.user.id,
            deleted: 'true',
            deleted_at: new Date().toISOString()
          }
        })

        logger.info({
          msg: 'Stripe customer updated after account deletion',
          event: 'stripe_customer_anonymized',
          metadata: { customerId }
        })
      } catch (stripeCustomerError) {
        logger.error({
          msg: 'Failed to update Stripe customer',
          event: 'stripe_customer_update_failed',
          metadata: {
            customerId,
            error:
              stripeCustomerError instanceof Error
                ? stripeCustomerError.message
                : String(stripeCustomerError)
          }
        })
      }
    }

    logger.info({
      msg: 'User deletion completed',
      event: 'user_deleted',
      metadata: {
        clerkId: userData.clerkId,
        hadSubscription: !!userWithSubscription?.sub
      }
    })

    return {
      received: true,
      message: 'User deleted successfully'
    }
  } catch (error) {
    logger.error({
      msg: 'Error during user deletion processing',
      event: 'user_deletion_error',
      metadata: {
        clerkId: userData.clerkId,
        error: error instanceof Error ? error.message : String(error)
      }
    })

    return {
      received: true,
      message: 'User deletion processed with errors'
    }
  }
}
