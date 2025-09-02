import { logger } from '@ritchy/logger'
import type { GetListContentApiResponse, Place } from '@ritchy/types'
import { and, eq } from 'drizzle-orm'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { db } from '../../db/db'
import { list, listPlace, place, userPlace } from '../../db/schema'
import { getAggregatedUserPlaces } from '../../services/places/queries/get_aggregated_user_places'
import { refreshPlaces } from '../../services/places/refresh_places'

export const getListContent = async (
  req: Request<{ id: string }>,
  res: Response<GetListContentApiResponse>,
): Promise<void> => {
  logger.info({
    msg: 'Get list content',
    event: 'get_list_content',
    metadata: {
      listId: req.params.id,
      userId: req.auth.userId,
    },
  })
  try {
    const listId = req.params.id
    const userId = req.auth.userId

    // Verify list ownership
    const result = await db
      .select()
      .from(list)
      .where(and(eq(list.id, listId), eq(list.userId, userId)))
      .limit(1)

    if (!result.length) {
      res.status(404).json({
        error: 'List not found',
      })
      return
    }

    let placesResults = []
    placesResults = await getAggregatedUserPlaces(userId, undefined, listId)

    const cacheMisses = placesResults
      .filter((place) => !place.isDeleted)
      .filter(
        (place) => place.googleMapsUri === null || place.googleMapsUri === '',
      )
    if (cacheMisses.length > 0) {
      logger.error({
        msg: 'Places in list are not complete, fetching missing places',
        event: 'places_in_list_not_complete',
        metadata: {
          listId,
          places: cacheMisses.map((place) => place.id),
          cacheMisses: cacheMisses.length,
        },
      })
      // Get all place IDs in the list with their searchId
      const places = await db
        .select({
          id: userPlace.id,
        })
        .from(listPlace)
        .innerJoin(userPlace, eq(listPlace.userPlaceId, userPlace.id))
        .innerJoin(place, eq(userPlace.place_id, place.id))
        .where(eq(listPlace.listId, listId))

      // Use shared utility to get place details and aggregate data
      await refreshPlaces(
        places.map((place) => place.id),
        {
          userId,
          excludeListId: listId,
          listId,
        },
      )
      placesResults = await getAggregatedUserPlaces(userId, undefined, listId)
    }

    res.json({
      id: String(result[0].id),
      name: result[0].name,
      emoji: result[0].emoji,
      items: placesResults,
      createdAt: result[0].createdAt.toISOString(),
      updatedAt: result[0].updatedAt.toISOString(),
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
      msg: 'Get list content error',
      event: 'get_list_content_error',
      metadata: { error },
    })
    res.status(500).json({
      error: 'Failed to get list content',
      message: 'Failed to get list content',
    })
    return
  }
}
