import { logger } from '@ritchy/logger'
import type { GetPlaceApiResponse } from '@ritchy/types'
import { and, eq } from 'drizzle-orm'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { db } from '../../db/db'
import { userPlace } from '../../db/schema'
import { getAggregatedUserPlaces } from '../../services/places/queries/get_aggregated_user_places'
import { refreshPlaces } from '../../services/places/refresh_places'

export const getPlace = async (
  req: Request<{ userPlaceId: string }>,
  res: Response<GetPlaceApiResponse>,
): Promise<void> => {
  logger.info({
    msg: 'Get place by user_place_id',
    event: 'get_place',
    metadata: {
      userPlaceId: req.params.userPlaceId,
      userId: req.auth.userId,
    },
  })
  try {
    const userPlaceId = req.params.userPlaceId
    const userId = req.auth.userId

    // Verify user_place ownership
    const result = await db
      .select()
      .from(userPlace)
      .where(and(eq(userPlace.id, userPlaceId), eq(userPlace.user_id, userId)))
      .limit(1)

    if (!result.length) {
      res.status(404).json({
        error: 'Place not found',
      })
      return
    }

    let placesResults = await getAggregatedUserPlaces(
      userId,
      undefined,
      undefined,
      userPlaceId,
    )

    // Check if place data is incomplete and needs refresh
    const place = placesResults[0]
    if (
      place &&
      !place.isDeleted &&
      (!place.sourceUrl || place.sourceUrl === '')
    ) {
      logger.error({
        msg: 'Place is not complete, fetching missing data',
        event: 'place_not_complete',
        metadata: {
          userPlaceId,
          placeId: place.id,
        },
      })

      await refreshPlaces([place.id], {
        userId,
      })
      placesResults = await getAggregatedUserPlaces(
        userId,
        undefined,
        undefined,
        userPlaceId,
      )
    }

    if (!placesResults.length) {
      res.status(404).json({
        error: 'Place not found',
      })
      return
    }

    res.json({
      place: placesResults[0],
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

    logger.error({
      msg: 'Get place error',
      event: 'get_place_error',
      metadata: { error },
    })
    res.status(500).json({
      error: 'Failed to get place',
      message: 'Failed to get place',
    })
    return
  }
}
