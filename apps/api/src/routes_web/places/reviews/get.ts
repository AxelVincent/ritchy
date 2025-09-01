import { logger } from '@ritchy/logger'
import type { GetReviewsApiResponse, GetReviewsRequest } from '@ritchy/types'
import { getPlaceByUserPlaceId } from 'apps/api/src/services/places/queries/get_place_by_user_place_id'
import type { Request, Response } from 'express'
import type { PreferredPlace } from '../../../external/google_maps/types'
import { REDIS_KEYS } from '../../../internal/redis/keys'
import { redisClient } from '../../../internal/redis/redis'

export const getPlaceReviews = async (
  req: Request<GetReviewsRequest>,
  res: Response<GetReviewsApiResponse>,
) => {
  const { placeSourceId } = req.params
  try {
    const place = await getPlaceByUserPlaceId(placeSourceId)

    if (!place) {
      logger.error({
        msg: 'Place reviews not found in cache',
        event: 'place_reviews_not_found_in_cache',
        metadata: { placeSourceId },
      })
      res.status(404).json({
        error: 'Place not found',
      })
      return
    }

    // Return reviews or empty array if no reviews exist
    res.json({
      reviews:
        place.reviews?.map((review) => ({
          name: review.name,
          rating: review.rating,
          text: review.text,
          originalText: review.originalText,
          authorAttribution: review.authorAttribution,
          publishTime: review.publishTime,
          googleMapsUri: review.googleMapsUri,
        })) || [],
    })
  } catch (error) {
    logger.error({
      msg: 'Failed to get place reviews',
      event: 'get_place_reviews_error',
      metadata: { error, placeSourceId },
    })
    res.status(500).json({
      error: 'Failed to get place reviews',
    })
  }
}
