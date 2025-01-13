import { logger } from '@ritchy/logger'
import type { ListContentApiResponse } from '@ritchy/types'
import { sql } from 'drizzle-orm'
import { and, eq } from 'drizzle-orm'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { db } from '../../db/db'
import { list, listPlace } from '../../db/schema'
import { getPlaceDetailsV1 } from '../../external/google_maps/place_details_V1'
import { findListAssociationsForPlaces } from '../../services/lists/findListAssociationsForPlaces'

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

    const placeDetails = await Promise.all(
      places.map((place) => getPlaceDetailsV1(place.placeId)),
    )

    const associations = await findListAssociationsForPlaces(
      places.map((place) => place.placeId),
      userId,
      listId,
    )

    res.json({
      id: String(result[0].id),
      name: result[0].name,
      emoji: result[0].emoji,
      items: placeDetails.map((place) => ({
        ...place,
        associatedLists: associations.get(place.id),
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
        details: error.errors,
      })
      return
    }

    logger.error({
      msg: 'Get list content error',
      event: 'get_list_content_error',
      metadata: { error },
    })
    res.status(500).json({ error: 'Failed to get list content' })
  }
}
