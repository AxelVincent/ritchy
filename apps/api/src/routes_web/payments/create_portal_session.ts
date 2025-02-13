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
  try {
    const userSubscription = await db
      .select()
      .from(subscription)
      .where(eq(subscription.userId, req.auth.userId))

    if (!userSubscription) {
      throw new Error('User has no subscription')
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: userSubscription[0].stripeCustomerId,
      return_url: `${process.env.FRONTEND_BASE_URL}/search?portal_return=true`,
    })

    res.json({
      url: portalSession.url,
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
      msg: 'Create portal session error',
      event: 'create_portal_session_error',
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
      error: 'Failed to create portal session',
      message: 'Failed to create portal session',
    })
    return
  }
}
