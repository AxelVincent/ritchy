import { logger } from '@ritchy/logger'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { upsertStatus } from '../../../services/places/status/upsert_status'
import type {
  UpdateStatusApiResponse,
  UpdateStatusBody,
  UpdateStatusParams,
} from './contract'

export const updateStatusHandler = async (
  req: Request<UpdateStatusParams, UpdateStatusApiResponse, UpdateStatusBody>,
  res: Response<UpdateStatusApiResponse>,
): Promise<void> => {
  logger.info({
    msg: 'Updating status',
    event: 'update_status',
    metadata: {
      userPlaceId: req.params.userPlaceId,
      status: req.body.status,
    },
  })

  try {
    const { status } = req.body
    const { userPlaceId } = req.params

    const result = await upsertStatus(req.auth.userId, userPlaceId, status)

    res.json(result)
    logger.info({
      msg: 'Status updated',
      event: 'status_updated',
      metadata: {
        userPlaceId: req.params.userPlaceId,
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

    // Add specific handling for user place not found
    if (error instanceof Error && error.message.includes('not found')) {
      logger.warn({
        msg: 'User place not found for status update',
        event: 'user_place_not_found',
        metadata: {
          userPlaceId: req.params.userPlaceId,
          userId: req.auth.userId,
        },
      })
      res.status(404).json({
        error: 'Place not found',
        message:
          'The place you are trying to update was not found or has been removed.',
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
