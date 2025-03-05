import { logger } from '@ritchy/logger'
import {
  type UpdateStatusApiResponse,
  type UpdateStatusRequest,
  UpdateStatusRequestSchema,
} from '@ritchy/types'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { upsertLeadStatus } from '../../services/status/upsertStatus'

export const updateStatus = async (
  req: Request<UpdateStatusRequest>,
  res: Response<UpdateStatusApiResponse>,
): Promise<void> => {
  try {
    const parsedBody = UpdateStatusRequestSchema.parse({
      placeId: req.params.placeId,
      status: req.body.status,
    })

    const result = await upsertLeadStatus(
      parsedBody.placeId,
      req.auth.userId,
      parsedBody.status,
    )

    res.json(result)
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
      msg: 'Update status error',
      event: 'update_status_error',
      metadata: {
        error: error instanceof Error ? error : { error },
        body: req.body,
        userId: req.auth.userId,
      },
    })
    res.status(500).json({
      error: 'Failed to update status',
      message: 'Failed to update status',
    })
    return
  }
}
