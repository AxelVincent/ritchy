import { logger } from '@ritchy/logger'
import type { Request, Response } from 'express'
import { getBatchEnrichmentStatus } from '../../../services/enrichment/shared/status/status_manager'
import { BatchStatusQuerySchema, type BatchStatusResponse } from './contract'

export const getBatchEnrichmentStatusHandler = async (
  req: Request<
    Record<string, never>,
    BatchStatusResponse,
    unknown,
    { userPlaceIds: string }
  >,
  res: Response<BatchStatusResponse>,
): Promise<void> => {
  try {
    const { userPlaceIds } = BatchStatusQuerySchema.parse(req.query)
    const statusMap = await getBatchEnrichmentStatus(userPlaceIds)
    res.json(statusMap)
  } catch (error) {
    logger.error({
      msg: 'Failed to get batch enrichment status',
      event: 'batch_enrichment_status_error',
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
    })
    res.status(500).json({})
  }
}
