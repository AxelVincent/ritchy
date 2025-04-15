import { logger } from '@ritchy/logger'
import type { GeocodeApiResponse, GeocodeRequestParams } from '@ritchy/types'
import type { Request, Response } from 'express'
import { getGeocodeV1 } from '../../external/google_maps/geocode_V1'

export const getGeocode = async (
  req: Request<GeocodeRequestParams>,
  res: Response<GeocodeApiResponse>,
) => {
  try {
    const result = await getGeocodeV1(req.params)
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
