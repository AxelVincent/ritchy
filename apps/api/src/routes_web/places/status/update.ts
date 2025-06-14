import { logger } from '@ritchy/logger'
import type {
  UpdateStatusApiResponse,
  UpdateStatusRequest,
} from '@ritchy/types'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { upsertStatus } from '../../../services/places/status/upsert_status'

export const updateStatus = async (
  req: Request<UpdateStatusRequest>,
  res: Response<UpdateStatusApiResponse>,
): Promise<void> => {
  logger.info({
    msg: 'Updating status',
    event: 'update_status',
    metadata: {
      placeId: req.params.placeId,
      status: req.body.status,
    },
  })

  try {
    const { status } = req.body
    const { placeId } = req.params

    const result = await upsertStatus(
      {
        userId: req.auth.userId,
        sessionId: req.auth.sessionId,
        changeSource: 'user',
        metadata: {
          ...req.metadata,
        },
      },
      placeId,
      status,
    )

    res.json(result)
    logger.info({
      msg: 'Status updated',
      event: 'status_updated',
      metadata: {
        placeId: req.params.placeId,
      },
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
