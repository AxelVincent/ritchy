import { logger } from '@ritchy/logger'
import { eq } from 'drizzle-orm'
import type Stripe from 'stripe'
import type { StripePlan } from '../../config/stripe'
import { getPlanFromProductId } from '../../config/stripe'
import { db } from '../../db/db'
import { subscription } from '../../db/schema'
import { credits as creditsTable } from '../../db/schema/credits'
import { CREDIT_CONFIG } from './config'

type SubscriptionResult = {
  planType: StripePlan
  isNew: boolean
}

/**
 * Creates or updates a subscription record and allocates credits
 * Used for both subscription.created (with 100% coupon) and subscription.updated events
 *
 * @param stripeEvent - The Stripe subscription event object
 * @param userId - The user ID from metadata
 * @returns Object containing the plan type and whether this was a new subscription
 * @throws Error if required subscription fields are missing
 */
export const createOrUpdateSubscription = async (
  stripeEvent: Stripe.Subscription,
  userId: string,
): Promise<SubscriptionResult> => {
  const stripeCustomerId = stripeEvent.customer as string
  const stripeSubscriptionId = stripeEvent.id
  const items = stripeEvent.items?.data

  // Validate required fields
  if (
    !items ||
    items.length === 0 ||
    !items[0]?.price?.id ||
    !items[0]?.plan?.product
  ) {
    logger.error({
      msg: 'Missing required subscription fields',
      event: 'subscription_invalid_data',
      metadata: {
        subscriptionId: stripeSubscriptionId,
        hasItems: !!items,
        itemsLength: items?.length ?? 0,
        hasPriceId: !!items?.[0]?.price?.id,
        hasProduct: !!items?.[0]?.plan?.product,
      },
    })
    throw new Error('Missing required subscription fields')
  }

  const stripePriceId = items[0].price.id
  const productId = items[0].plan.product as string
  const planType = getPlanFromProductId(productId)
  // TODO: Remove search model
  const searchModel =
    planType === 'ESSENTIALS' || planType === 'PRO' ? 'ENHANCED' : 'BASIC'
  const status = stripeEvent.status

  // Check if subscription already exists to determine if this is new
  const existingSubscription = await db
    .select()
    .from(subscription)
    .where(eq(subscription.userId, userId))
    .limit(1)

  const isNew = existingSubscription.length === 0

  logger.info({
    msg: isNew ? 'Creating new subscription' : 'Updating existing subscription',
    event: isNew ? 'subscription_creating' : 'subscription_updating',
    metadata: {
      userId,
      subscriptionId: stripeSubscriptionId,
      plan: planType,
      status,
      isNew,
    },
  })

  // Create or update subscription record
  await db
    .insert(subscription)
    .values({
      userId,
      stripeSubscriptionId,
      stripePriceId,
      stripeCustomerId,
      status,
      plan: planType,
      searchModel,
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

  // Allocate credits for the subscription
  const creditConfig = CREDIT_CONFIG.find((config) => config.plan === planType)
  const credits = creditConfig?.credits ?? 0

  logger.info({
    msg: 'Allocating credits for subscription',
    event: 'subscription_credits_allocating',
    metadata: {
      userId,
      plan: planType,
      credits,
    },
  })

  await db
    .insert(creditsTable)
    .values({
      userId,
      credits,
    })
    .onConflictDoUpdate({
      target: creditsTable.userId,
      set: {
        credits,
      },
    })

  logger.info({
    msg: 'Subscription record created/updated successfully',
    event: isNew ? 'subscription_created' : 'subscription_updated',
    metadata: {
      userId,
      subscriptionId: stripeSubscriptionId,
      plan: planType,
      status,
      credits,
    },
  })

  return { planType, isNew }
}
