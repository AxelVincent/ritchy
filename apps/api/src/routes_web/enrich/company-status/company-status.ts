import { logger } from '@ritchy/logger'
import type { Request, Response } from 'express'
import { getCompanyEnrichmentStatus } from '../../../services/enrichment/shared/status/status_manager'
import {
  CompanyStatusParamsSchema,
  type CompanyStatusResponse,
} from './contract'

export const getCompanyStatusHandler = async (
  req: Request<{ userPlaceId: string }>,
  res: Response<CompanyStatusResponse>,
): Promise<void> => {
  try {
    const { userPlaceId } = CompanyStatusParamsSchema.parse(req.params)
    const status = await getCompanyEnrichmentStatus(userPlaceId)
    res.json(status)
  } catch (error) {
    logger.error({
      msg: 'Failed to get company enrichment status',
      event: 'company_status_error',
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
      error: 'Failed to get company enrichment status',
    })
  }
}
