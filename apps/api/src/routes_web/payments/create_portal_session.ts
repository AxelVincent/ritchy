import { logger } from '@ritchy/logger'
import type { CreatePortalSessionApiResponse } from '@ritchy/types'
import { eq } from 'drizzle-orm'
import type { Request, Response } from 'express'
import Stripe from 'stripe'
import { z } from 'zod'
import { STRIPE_CONFIG } from '../../config/stripe'
import { db } from '../../db/db'
import { subscription } from '../../db/schema'

const stripe = new Stripe(STRIPE_CONFIG.API_KEYS.SECRET_KEY, {
  apiVersion: '2025-01-27.acacia',
})

export const createPortalSession = async (
  req: Request<
    Record<string, never>,
    CreatePortalSessionApiResponse,
    never,
    never
  >,
  res: Response<CreatePortalSessionApiResponse>,
): Promise<void> => {
  logger.info({
    msg: 'Portal session creation initiated',
    event: 'portal_session_started',
  })

  try {
    const userSubscription = await db
      .select()
      .from(subscription)
      .where(eq(subscription.userId, req.auth.userId))

    logger.info({
      msg: 'Subscription status checked',
      event: 'subscription_status_checked',

      metadata: {
        hasSubscription: userSubscription.length > 0,
        subscriptionStatus: userSubscription[0]?.status,
        stripeCustomerId: userSubscription[0]?.stripeCustomerId,
      },
    })

    if (!userSubscription.length) {
      logger.warn({
        msg: 'No subscription found for user',
        event: 'subscription_not_found',
      })
      throw new Error('User has no subscription')
    }

    logger.info({
      msg: 'Creating portal session',
      event: 'portal_session_creating',

      metadata: {
        stripeCustomerId: userSubscription[0].stripeCustomerId,
        returnUrl: `${process.env.FRONTEND_BASE_URL}/search?portal_return=true`,
      },
    })

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: userSubscription[0].stripeCustomerId,
      return_url: `${process.env.FRONTEND_BASE_URL}/search?portal_return=true`,
    })

    logger.info({
      msg: 'Portal session created successfully',
      event: 'portal_session_created',

      metadata: {
        portalSessionId: portalSession.id,
        portalSessionUrl: portalSession.url,
      },
    })

    res.json({
      url: portalSession.url,
    })
    return
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.info({
        msg: 'Portal session validation error',
        event: 'portal_session_validation_error',
        metadata: { error },
      })
      res.status(400).json({
        error: 'Invalid request data',
        message: 'Invalid request data',
      })
      return
    }

    logger.error({
      msg: 'Portal session creation failed',
      event: 'portal_session_error',

      metadata: {
        error:
          error instanceof Error
            ? {
                message: error.message,
                name: error.name,
                stack: error.stack,
              }
            : error,
      },
    })
    res.status(500).json({
      error: 'Failed to create portal session',
      message: 'Failed to create portal session',
    })
    return
  }
}
