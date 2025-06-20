import { logger } from '@ritchy/logger'
import type { GetReviewsApiResponse, GetReviewsRequest } from '@ritchy/types'
import type { Request, Response } from 'express'
import type { PreferredPlace } from '../../../external/google_maps/types'
import { REDIS_KEYS } from '../../../lib/redis/keys'
import { redisClient } from '../../../lib/redis/redis'

export const getPlaceReviews = async (
  req: Request<GetReviewsRequest>,
  res: Response<GetReviewsApiResponse>,
) => {
  try {
    const { placeId } = req.params

    // Try to get place details from cache first
    const cachedPlace = await redisClient.get<PreferredPlace>(
      REDIS_KEYS.place(placeId),
    )

    const place = cachedPlace?.data

    if (!place) {
      logger.error({
        msg: 'Place reviews not found in cache',
        event: 'place_reviews_not_found_in_cache',
        metadata: { placeId },
      })
      res.status(404).json({
        error: 'Place not found',
      })
      return
    }

    // Return reviews or empty array if no reviews exist
    res.json({
      reviews: place.reviews || [],
    })
  } catch (error) {
    logger.error({
      msg: 'Failed to get place reviews',
      event: 'get_place_reviews_error',
      metadata: { error },
    })
    res.status(500).json({
      error: 'Failed to get place reviews',
    })
  }
}
