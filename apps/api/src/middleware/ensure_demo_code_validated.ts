import { logger } from '@ritchy/logger'
import type { ApiErrorResponse } from '@ritchy/types' // For the response type
import { eq } from 'drizzle-orm'
import type { NextFunction, Request, Response } from 'express'
import { db } from '../db/db'
import { userDemoCode } from '../db/schema'
import { getUserPlan } from '../services/payment/queries/get_user_plan' // Assuming this service exists and works

export const ensureDemoCodeValidated = async (
  req: Request,
  res: Response<ApiErrorResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.auth?.userId

    if (!userId) {
      // This should technically be caught by isAuthenticated middleware first
      logger.warn({
        msg: 'No user ID found in ensureDemoCodeValidated middleware',
        event: 'demo_code_middleware_no_userid',
        metadata: { path: req.path }
      })
      // Sending a generic auth error as the issue is likely upstream
      res.status(401).json({
        error: 'unauthorized',
        message: 'Authentication required.'
      })
      return
    }

    const userPlan = await getUserPlan(userId) // Fetches 'FREE', 'PRO', etc.

    // If user is not on a FREE plan, they don't need demo code validation
    if (userPlan !== 'FREE') {
      next()
      return
    }

    // User is on a FREE plan, check if their demo code is validated
    const [demoCodeRecord] = await db
      .select({
        isValidated: userDemoCode.isValidated
      })
      .from(userDemoCode)
      .where(eq(userDemoCode.userId, userId))

    if (demoCodeRecord?.isValidated) {
      next() // Code validated, allow access
    } else {
      logger.info({
        msg: 'Access denied: Demo code not validated for free user',
        event: 'demo_code_not_validated_access_denied',
        metadata: { userId, path: req.path, userPlan }
      })
      res.status(403).json({
        error: 'demo_code_required',
        message:
          'Access to this feature requires demo code validation for free trial users.'
      })
    }
  } catch (error) {
    logger.error({
      msg: 'Error in ensureDemoCodeValidated middleware',
      event: 'demo_code_middleware_error',
      metadata: { error, userId: req.auth?.userId, path: req.path }
    })
    res.status(500).json({
      error: 'internal_server_error',
      message: 'An error occurred while verifying demo code status.'
    })
  }
}
