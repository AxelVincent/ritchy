import { logger } from '@ritchy/logger'
import type { UserMeApiResponse } from '@ritchy/types' // This type will be from packages/types/src/api/users/me.ts
import { eq } from 'drizzle-orm'
import type { Request, Response } from 'express'
import { db } from '../../db/db'
import { userDemoCode } from '../../db/schema'
import { getUserPlan } from '../../services/subscription'

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

    res.json({ plan, isDemoValidated })
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
