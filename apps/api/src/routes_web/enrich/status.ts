import { logger } from '@ritchy/logger'
import type {
  BatchEnrichmentStatusResponse,
  EnrichmentStatusResponse,
} from '@ritchy/types'
import type { Request, Response } from 'express'
import { z } from 'zod'
import {
  getBatchEnrichmentStatus,
  getEnrichmentStatus,
} from '../../services/enrichment/status_manager'

const StatusParamsSchema = z.object({
  userPlaceId: z.string().uuid(),
})

const BatchStatusQuerySchema = z.object({
  userPlaceIds: z
    .union([z.string().uuid(), z.array(z.string().uuid())])
    .transform((val) => (Array.isArray(val) ? val : [val]))
    .pipe(z.array(z.string().uuid()).min(1).max(500)), // Increased to 500 to support larger tables
})

export const getEnrichmentStatusHandler = async (
  req: Request<{ userPlaceId: string }>,
  res: Response<EnrichmentStatusResponse>,
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

export const getBatchEnrichmentStatusHandler = async (
  req: Request<
    Record<string, never>,
    BatchEnrichmentStatusResponse,
    unknown,
    { userPlaceIds: string }
  >,
  res: Response<BatchEnrichmentStatusResponse>,
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
