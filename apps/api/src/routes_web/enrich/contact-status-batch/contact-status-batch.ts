import { logger } from '@ritchy/logger'
import type { Request, Response } from 'express'
import { getBatchContactEnrichmentStatus } from '../../../services/enrichment/shared/status/status_manager'
import type { EnrichmentStatusResponse } from '../shared'
import {
  BatchContactStatusQuerySchema,
  type BatchContactStatusResponse,
} from './contract'

export const getBatchContactStatusHandler = async (
  req: Request<
    Record<string, never>,
    BatchContactStatusResponse,
    unknown,
    { contactIds: string }
  >,
  res: Response<Record<string, EnrichmentStatusResponse>>,
): Promise<void> => {
  try {
    const { contactIds } = BatchContactStatusQuerySchema.parse(req.query)
    const statusMap = await getBatchContactEnrichmentStatus(contactIds)
    res.json(statusMap)
  } catch (error) {
    logger.error({
      msg: 'Failed to get batch contact enrichment status',
      event: 'batch_contact_status_error',
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
    })
    res.status(500).json({})
  }
}
