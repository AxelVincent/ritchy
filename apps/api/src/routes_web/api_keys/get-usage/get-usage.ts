import { logger } from '@ritchy/logger'
import type { Request, Response } from 'express'
import { getApiUsageStats } from '../../../services/api_keys'
import { getUserCredits } from '../../../services/payment/queries/get_user_credits'
import type { GetApiUsageApiResponse } from './contract'

export const getApiUsageHandler = async (
  req: Request,
  res: Response<GetApiUsageApiResponse>,
): Promise<void> => {
  try {
    const { userId } = req.auth

    const [usageStats, creditsRemaining] = await Promise.all([
      getApiUsageStats(userId),
      getUserCredits(userId),
    ])

    res.json({
      success: true,
      data: {
        ...usageStats,
        creditsRemaining,
      },
    })
  } catch (error) {
    logger.error({
      msg: 'Failed to get API usage stats',
      event: 'api_usage_stats_error',
      metadata: { error },
    })

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get usage stats',
      },
    })
  }
}
