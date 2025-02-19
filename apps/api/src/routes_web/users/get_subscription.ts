import { logger } from '@ritchy/logger'

import type { UserSubscriptionApiResponse } from '@ritchy/types'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { getUserPlan } from '../../services/subscription'

export const getSubscription = async (
  req: Request,
  res: Response<UserSubscriptionApiResponse>,
): Promise<void> => {
  try {
    const userId = req.auth.userId
    const plan = await getUserPlan(userId)
    res.json({ plan })
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
        details: error.errors,
      })
      return
    }

    logger.error({
      msg: 'Get subscription error',
      event: 'get_subscription_error',
      metadata: { error },
    })
    res.status(500).json({
      error: 'Failed to get subscription',
      message: 'Failed to get subscription',
    })
    return
  }
}
