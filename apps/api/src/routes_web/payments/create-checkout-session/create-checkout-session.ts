import { logger } from '@ritchy/logger'
import { eq } from 'drizzle-orm'
import type { Request, Response } from 'express'
import Stripe from 'stripe'
import { z } from 'zod'
import {
  STRIPE_CONFIG,
  STRIPE_PLANS,
  type StripePlan,
} from '../../../config/stripe'
import { db } from '../../../db/db'
import { subscription } from '../../../db/schema'
import type {
  CreateCheckoutSessionApiResponse,
  CreateCheckoutSessionRequest,
} from './contract'
import { CreateCheckoutSessionRequestSchema } from './contract'

const stripe = new Stripe(STRIPE_CONFIG.API_KEYS.SECRET_KEY, {
  apiVersion: '2025-01-27.acacia',
})

export const createCheckoutSessionHandler = async (
  req: Request<
    Record<string, never>,
    CreateCheckoutSessionApiResponse,
    CreateCheckoutSessionRequest,
    never
  >,
  res: Response<CreateCheckoutSessionApiResponse>,
): Promise<void> => {
  logger.info({
    msg: 'Checkout session creation initiated',
    event: 'checkout_session_started',

    metadata: {
      requestedPlan: req.body.plan,
    },
  })

  try {
    // Validate request body
    CreateCheckoutSessionRequestSchema.parse(req.body)

    logger.info({
      msg: 'Checkout request validated',
      event: 'checkout_validation_passed',

      metadata: {
        plan: req.body.plan,
        billingInterval: req.body.billingInterval,
        currency: req.body.currency,
      },
    })

    // Check subscription status in database
    const userSubscription = await db.query.subscription.findFirst({
      where: eq(subscription.userId, req.auth.userId),
      columns: {
        stripeCustomerId: true,
        status: true,
      },
    })

    logger.info({
      msg: 'Current subscription status checked',
      event: 'subscription_status_checked',

      metadata: {
        hasExistingSubscription: !!userSubscription,
        subscriptionStatus: userSubscription?.status,
      },
    })

    if (
      userSubscription?.status === 'active' ||
      userSubscription?.status === 'trialing'
    ) {
      logger.info({
        msg: 'Redirecting to customer portal for active subscription',
        event: 'redirect_to_customer_portal',
        metadata: {
          stripeCustomerId: userSubscription.stripeCustomerId,
          subscriptionStatus: userSubscription.status,
        },
      })

      // Create customer portal session using the stored customer ID
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: userSubscription.stripeCustomerId,
        return_url: `${process.env.FRONTEND_BASE_URL}/search`,
      })

      logger.info({
        msg: 'Customer portal session created',
        event: 'customer_portal_created',
        metadata: {
          portalSessionId: portalSession.id,
        },
      })

      res.json({
        portalUrl: portalSession.url,
        clientSecret: null,
      })
      return
    }

    // Continue with checkout session creation for new subscribers
    const plan = req.body.plan
    const billingInterval = req.body.billingInterval || 'monthly'

    // Select the correct price ID based on plan and billing interval
    const priceId =
      billingInterval === 'yearly'
        ? STRIPE_PLANS[plan].price?.yearly
        : billingInterval === 'quarterly'
          ? STRIPE_PLANS[plan].price?.quarterly
          : STRIPE_PLANS[plan].price?.monthly

    if (!priceId) {
      logger.error({
        msg: 'Invalid plan or billing interval requested',
        event: 'invalid_plan_error',
        metadata: {
          requestedPlan: plan,
          requestedBillingInterval: billingInterval,
          availablePlans: Object.keys(STRIPE_PLANS),
        },
      })
      throw new Error(
        `Invalid plan: ${plan} or billing interval: ${billingInterval}`,
      )
    }

    logger.info({
      msg: 'Creating new checkout session',
      event: 'checkout_session_creating',

      metadata: {
        plan,
        billingInterval,
        priceId,
      },
    })

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      currency: req.body.currency,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        user_id: req.auth.userId,
      },
      subscription_data: {
        metadata: {
          user_id: req.auth.userId,
        },
      },
      ui_mode: 'embedded',
      return_url: `${process.env.FRONTEND_BASE_URL}/search?checkout_return=true`,
      allow_promotion_codes: true,
      client_reference_id: req.auth.userId,
    })

    logger.info({
      msg: 'Checkout session created successfully',
      event: 'checkout_session_created',

      metadata: {
        checkoutSessionId: session.id,
        plan,
        billingInterval,
        priceId,
      },
    })

    res.json({
      clientSecret: session.client_secret,
      portalUrl: null,
    })
    return
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.info({
        msg: 'Checkout validation error',
        event: 'checkout_validation_error',
        metadata: {
          validationErrors: error.errors,
          requestBody: req.body,
        },
      })
      res.status(400).json({
        error: 'Invalid request data',
        message: 'Invalid request data',
      })
      return
    }

    logger.error({
      msg: 'Checkout session creation failed',
      event: 'checkout_session_error',

      metadata: {
        error:
          error instanceof Error
            ? {
                message: error.message,
                name: error.name,
                stack: error.stack,
              }
            : error,
        requestBody: req.body,
      },
    })
    res.status(500).json({
      error: 'Failed to create checkout session',
      message: 'Failed to create checkout session',
    })
    return
  }
}
