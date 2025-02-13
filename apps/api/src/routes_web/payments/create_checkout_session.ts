import { logger } from '@ritchy/logger'
import { eq } from 'drizzle-orm'
import type { Request, Response } from 'express'
import Stripe from 'stripe'
import { STRIPE_CONFIG, STRIPE_PLANS, type StripePlan } from '../../config/stripe'
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
  try {
    // Validate request query instead of params
    CreateCheckoutSessionRequestBodySchema.parse(req.body)

    // Check subscription status in database
    const userSubscription = await db.query.subscription.findFirst({
      where: eq(subscription.userId, req.auth.userId),
      columns: {
        stripeCustomerId: true,
        status: true,
      },
    })

    if (
      userSubscription?.status === 'active' ||
      userSubscription?.status === 'trialing'
    ) {
      // Create customer portal session using the stored customer ID
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: userSubscription.stripeCustomerId,
        return_url: `${process.env.FRONTEND_BASE_URL}/search`,
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
      throw new Error(`Invalid plan: ${plan}`)
    }

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

    res.json({
      clientSecret: session.client_secret,
      portalUrl: null,
    })
    return
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.info({
        msg: 'Validation error',
        event: 'validation_error',
        metadata: { error },
      })
      res.status(400).json({
        error: 'Invalid request data',
        message: 'Invalid request data',
      })
      return
    }

    logger.error({
      msg: 'Create checkout session error',
      event: 'create_checkout_session_error',
      metadata: {
        error:
          error instanceof Error
            ? {
                message: error.message,
                name: error.name,
                stack: error.stack,
              }
            : error,
        userId: req.auth.userId,
      },
    })
    res.status(500).json({
      error: 'Failed to create checkout session',
      message: 'Failed to create checkout session',
    })
    return
  }
}
