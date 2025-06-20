import { logger } from '@ritchy/logger'
import type { GetListContentApiResponse } from '@ritchy/types'
import { and, eq } from 'drizzle-orm'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { db } from '../../db/db'
import { list, listPlace } from '../../db/schema'
import { getPlacesWithDetails } from '../../services/places/getPlacesWithDetails'

export const getListContent = async (
  req: Request<{ id: string }>,
  res: Response<GetListContentApiResponse>,
): Promise<void> => {
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

    // Get all place IDs in the list with their searchId
    const places = await db
      .select({
        id: listPlace.id,
        placeId: listPlace.placeId,
        searchId: listPlace.searchId,
      })
      .from(listPlace)
      .where(eq(listPlace.listId, listId))

    // Convert to the format expected by the shared utility
    const placesWithSearchIds = places.map((place) => ({
      placeId: place.placeId,
      searchId: place.searchId || null,
    }))

    // Use shared utility to get place details and aggregate data
    const { places: aggregatedPlaceDetails } = await getPlacesWithDetails(
      placesWithSearchIds,
      {
        userId,
        excludeListId: listId,
        includeEnrichment: true,
        listId,
      },
    )

    res.json({
      id: String(result[0].id),
      name: result[0].name,
      emoji: result[0].emoji,
      items: aggregatedPlaceDetails,
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
