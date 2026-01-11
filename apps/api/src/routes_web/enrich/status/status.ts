import { logger } from '@ritchy/logger'
import type { Request, Response } from 'express'
import { getEnrichmentStatus } from '../../../services/enrichment/shared/status/status_manager'
import { StatusParamsSchema, type StatusResponse } from './contract'

export const getEnrichmentStatusHandler = async (
  req: Request<{ userPlaceId: string }>,
  res: Response<StatusResponse>,
): Promise<void> => {
  try {
    const { userPlaceId } = StatusParamsSchema.parse(req.params)
    const status = await getEnrichmentStatus(userPlaceId)
    res.json(status)
  } catch (error) {
    logger.error({
      msg: 'Failed to get enrichment status',
      event: 'enrichment_status_error',
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        userPlaceId: req.params.userPlaceId,
      },
    })
    res.status(500).json({
      status: 'idle',
      step: '',
      progress: 0,
      updatedAt: Date.now(),
      error: 'Failed to get enrichment status',
    })
  }
}
