import { logger } from '@ritchy/logger'
import {
  type AddItemFromGeocodeApiResponse,
  type AddItemFromGeocodeRequestBody,
  AddItemFromGeocodeRequestBodySchema,
  type AddItemFromGeocodeResponse,
} from '@ritchy/types'
import { and, eq } from 'drizzle-orm'
import type { Request, Response } from 'express'
import { db } from '../../db/db'
import { list, listPlace, userPlace } from '../../db/schema'
import { getPlaceDetailsV1 } from '../../external/google_maps/place_details_V1'

export const addItemFromGeocode = async (
  req: Request<
    Record<string, never>,
    AddItemFromGeocodeResponse,
    AddItemFromGeocodeRequestBody
  >,
  res: Response<AddItemFromGeocodeApiResponse>,
): Promise<void> => {
  try {
    const { googleMapsPlaceId, listId } = req.body
    const { userId } = req.auth

    // Verify list ownership
    const listResult = await db
      .select()
      .from(list)
      .where(and(eq(list.id, listId), eq(list.userId, userId)))
      .limit(1)

    if (!listResult.length) {
      res.status(404).json({
        error: 'List not found',
        message: 'List not found',
      })
      return
    }

    const place = await getPlaceDetailsV1({ sourceId: googleMapsPlaceId })

    // Use onConflictDoUpdate to get existing row or insert new one
    const [userPlaceResult] = await db
      .insert(userPlace)
      .values({
        place_id: place.id,
        user_id: userId,
      })
      .onConflictDoUpdate({
        target: [userPlace.place_id, userPlace.user_id],
        set: {
          place_id: userPlace.place_id,
          user_id: userPlace.user_id,
          updated_at: new Date(),
        },
      })
      .returning()

    // Check if the place is already in the list
    const existingListPlace = await db
      .select()
      .from(listPlace)
      .where(
        and(
          eq(listPlace.listId, listId),
          eq(listPlace.userPlaceId, userPlaceResult.id),
        ),
      )
      .limit(1)

    if (existingListPlace.length > 0) {
      res.status(409).json({
        success: false,
        message: 'Place is already in this list',
      })
      return
    }

    // Add the place to the list
    await db
      .insert(listPlace)
      .values({
        listId,
        userPlaceId: userPlaceResult.id,
      })
      .returning()

    res.status(200).json({
      success: true,
    })
  } catch (error) {
    logger.error({
      msg: 'Add item from geocode error',
      event: 'add_item_from_geocode_error',
      metadata: { error },
    })
    res.status(500).json({
      success: false,
      message: 'Failed to add item from geocode',
    })
  }
}
