import { logger } from '@ritchy/logger'
import type { ListContentApiResponse, Place } from '@ritchy/types'
import { and, eq } from 'drizzle-orm'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { db } from '../../db/db'
import { list, listPlace } from '../../db/schema'
import { getPlaceDetailsV1 } from '../../external/google_maps/place_details_V1'
import { getListAssociationsByPlaceIds } from '../../services/lists/getListAssociationsByPlaceIds'
import { getNotesByPlaceIds } from '../../services/notes/getNotesByPlaceIds'

export const getListContent = async (
  req: Request<{ id: string }>,
  res: Response<ListContentApiResponse>,
): Promise<void> => {
  try {
    const listId = Number.parseInt(req.params.id)
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

    // Get all place IDs in the list
    const places = await db
      .select({
        id: listPlace.id,
        placeId: listPlace.placeId,
      })
      .from(listPlace)
      .where(eq(listPlace.listId, listId))

    // Get place details with rate limiting
    const placeDetailsResults = await Promise.allSettled(
      places.map(async (place) => getPlaceDetailsV1(place.placeId)),
    )

    // Analyze results
    const cacheHits = placeDetailsResults.filter(
      (result) => result.status === 'fulfilled' && result.value.fromCache,
    ).length
    const cacheMisses = placeDetailsResults.filter(
      (result) => result.status === 'fulfilled' && !result.value.fromCache,
    ).length
    const errors = placeDetailsResults.filter(
      (result) => result.status === 'rejected',
    ).length

    logger.info({
      msg: 'Place details retrieval summary',
      event: 'place_details_summary',
      metadata: {
        totalPlaces: places.length,
        cacheHits,
        cacheMisses,
        errors,
        listId,
      },
    })

    const placeDetails = placeDetailsResults
      .filter(
        (
          result,
        ): result is PromiseFulfilledResult<Place & { fromCache: boolean }> =>
          result.status === 'fulfilled',
      )
      .map((result) => {
        const { fromCache, ...place } = result.value
        return place
      })

    const placeIds = places.map((place) => place.placeId)
    const associations = await getListAssociationsByPlaceIds(
      placeIds,
      userId,
      listId,
    )
    const notes = await getNotesByPlaceIds(placeIds, userId)

    res.json({
      id: String(result[0].id),
      name: result[0].name,
      emoji: result[0].emoji,
      items: placeDetails.map((place) => ({
        ...place,
        associatedLists: associations.get(place.id),
        notes: notes.get(place.id),
      })),
      createdAt: result[0].createdAt.toISOString(),
      updatedAt: result[0].updatedAt.toISOString(),
    })
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
  }
}
