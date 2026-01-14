import { logger } from '@ritchy/logger'
import type { Request, Response } from 'express'
import { enqueueGeocodeJob } from '../../../internal/bullmq/jobs/google/places/queue'
import type { GeocodeApiResponse, GeocodeRequestParams } from './contract'

export const geocodeHandler = async (
  req: Request<GeocodeRequestParams>,
  res: Response<GeocodeApiResponse>,
) => {
  try {
    const result = await enqueueGeocodeJob(req.params)
    res.json({ result })
  } catch (error) {
    logger.error({
      msg: 'Error fetching geocode result',
      event: 'geocode_error',
      metadata: { error },
    })
    res.status(500).json({
      error: 'Failed to geocode place',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
