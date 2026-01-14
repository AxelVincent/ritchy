import { logger } from '@ritchy/logger'
import type { Request, Response } from 'express'
import { CREDIT_CONFIG } from '../../../services/payment/config'
import { getNextRenewalDate } from '../../../services/payment/queries/get_next_renewal_date'
import { getUserCredits } from '../../../services/payment/queries/get_user_credits'
import { getUserPlan } from '../../../services/payment/queries/get_user_plan'
import type { UserMeApiResponse } from './contract'

export const getMeHandler = async (
  req: Request,
  res: Response<UserMeApiResponse>,
): Promise<void> => {
  const userId = req.auth?.userId

  if (!userId) {
    logger.warn({
      msg: 'User ID missing in getMeHandler',
      event: 'get_me_no_userid',
    })
    res
      .status(401)
      .json({ error: 'unauthorized', message: 'User not authenticated.' })
    return
  }

  try {
    const plan = await getUserPlan(userId)

    logger.info({
      msg: 'Successfully retrieved consolidated user data for /me endpoint',
      event: 'get_me_success',
      metadata: { userId, plan },
    })

    const credits = await getUserCredits(userId)
    logger.info({
      msg: 'Successfully retrieved user credits',
      event: 'get_me_success',
      metadata: { userId, credits },
    })
    const nextRenewalDate = await getNextRenewalDate(userId)
    logger.info({
      msg: 'Successfully retrieved user next renewal date',
      event: 'get_me_success',
      metadata: { userId, nextRenewalDate },
    })

    const creditsData = {
      plan: CREDIT_CONFIG.find((c) => c.plan === plan)?.credits ?? 0,
      credits,
    }

    res.json({ plan, credits: creditsData, nextRenewalDate })
  } catch (error) {
    logger.error({
      msg: 'Error fetching user data for /me endpoint',
      event: 'get_me_error',
      metadata: { error, userId: req.auth?.userId },
    })
    res.status(500).json({
      error: 'internal_server_error',
      message: 'An unexpected error occurred while fetching user data.',
    })
  }
}
