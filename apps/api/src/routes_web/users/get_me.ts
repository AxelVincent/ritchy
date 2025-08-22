import { logger } from '@ritchy/logger'
import type { UserMeApiResponse } from '@ritchy/types' // This type will be from packages/types/src/api/users/me.ts
import { eq } from 'drizzle-orm'
import type { Request, Response } from 'express'
import { db } from '../../db/db'
import { userDemoCode } from '../../db/schema'
import { CREDIT_CONFIG } from '../../services/payment/config'
import { getNextRenewalDate } from '../../services/payment/queries/get_next_renewal_date'
import { getUserCredits } from '../../services/payment/queries/get_user_credits'
import { getUserPlan } from '../../services/payment/queries/get_user_plan'

export const getMe = async (
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

    let isDemoValidated = false
    const [demoCodeRecord] = await db
      .select({
        isValidated: userDemoCode.isValidated,
      })
      .from(userDemoCode)
      .where(eq(userDemoCode.userId, userId))

    if (demoCodeRecord) {
      isDemoValidated = demoCodeRecord.isValidated
    } else {
      logger.info({
        msg: 'No demo code record found for user in getMe. Assuming not validated.',
        event: 'get_me_no_demo_record',
        metadata: { userId },
      })
    }

    logger.info({
      msg: 'Successfully retrieved consolidated user data for /me endpoint',
      event: 'get_me_success',
      metadata: { userId, plan, isDemoValidated },
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
      search: {
        plan: CREDIT_CONFIG.find((c) => c.plan === plan)?.credits.search ?? 0,
        credits: credits.search,
      },
      enrichment: {
        plan:
          CREDIT_CONFIG.find((c) => c.plan === plan)?.credits.enrichment ?? 0,
        credits: credits.enrichment,
      },
    }
    res.json({ plan, isDemoValidated, credits: creditsData, nextRenewalDate })
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
