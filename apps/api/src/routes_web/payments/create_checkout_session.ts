import { logger } from '@ritchy/logger'
import { eq } from 'drizzle-orm'
import type { Request, Response } from 'express'
import Stripe from 'stripe'
import {
  STRIPE_CONFIG,
  STRIPE_PLANS,
  type StripePlan,
} from '../../config/stripe'
import { db } from '../../db/db'
import { subscription } from '../../db/schema'

import {
  type CreateCheckoutSessionApiResponse,
  type CreateCheckoutSessionRequestBody,
  CreateCheckoutSessionRequestBodySchema,
} from '@ritchy/types'
import { z } from 'zod'

const stripe = new Stripe(STRIPE_CONFIG.API_KEYS.SECRET_KEY, {
  apiVersion: '2025-01-27.acacia',
})

export const createCheckoutSession = async (
  req: Request<
    Record<string, never>,
    CreateCheckoutSessionApiResponse,
    CreateCheckoutSessionRequestBody,
    never
  >,
  res: Response<CreateCheckoutSessionApiResponse>,
): Promise<void> => {
  logger.info({
    msg: 'Checkout session creation initiated',
    event: 'checkout_session_started',
    user: { id: req.auth.userId },
    metadata: {
      requestedPlan: req.body.plan,
    },
  })

  try {
    // Validate request body
    CreateCheckoutSessionRequestBodySchema.parse(req.body)

    logger.info({
      msg: 'Checkout request validated',
      event: 'checkout_validation_passed',
      user: { id: req.auth.userId },
      metadata: {
        plan: req.body.plan,
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
      user: { id: req.auth.userId },
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
        user: { id: req.auth.userId },
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
        user: { id: req.auth.userId },
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
    const plan = req.body.plan as StripePlan
    const priceId = STRIPE_PLANS[plan].priceId

    if (!priceId) {
      logger.error({
        msg: 'Invalid plan requested',
        event: 'invalid_plan_error',
        user: { id: req.auth.userId },
        metadata: {
          requestedPlan: plan,
          availablePlans: Object.keys(STRIPE_PLANS),
        },
      })
      throw new Error(`Invalid plan: ${plan}`)
    }

    logger.info({
      msg: 'Creating new checkout session',
      event: 'checkout_session_creating',
      user: { id: req.auth.userId },
      metadata: {
        plan,
        priceId,
      },
    })

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
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
      user: { id: req.auth.userId },
      metadata: {
        checkoutSessionId: session.id,
        plan,
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
        user: { id: req.auth.userId },
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
      user: { id: req.auth.userId },
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
