import { logger } from '@ritchy/logger'
import type { Request, Response } from 'express'
import { getApiActivityLog } from '../../../services/api_keys/queries/get_api_activity_log'
import {
  calculatePagination,
  getSafePaginationParams,
} from '../../../utils/pagination'
import type { GetApiActivityApiResponse, GetApiActivityQuery } from './contract'

export const getApiActivityHandler = async (
  req: Request<unknown, unknown, unknown, GetApiActivityQuery>,
  res: Response<GetApiActivityApiResponse>,
): Promise<void> => {
  try {
    const { userId } = req.auth
    const { page, pageSize, keyId, statusCode } = req.query

    const pagination = getSafePaginationParams({ page, pageSize })

    const { items, total } = await getApiActivityLog(userId, {
      pagination,
      keyId,
      statusCode,
    })

    res.json({
      success: true,
      data: {
        items,
        pagination: calculatePagination(pagination, total),
      },
    })
  } catch (error) {
    logger.error({
      msg: 'Failed to get API activity log',
      event: 'api_activity_log_error',
      metadata: { error },
    })

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get API activity log',
      },
    })
  }
}
