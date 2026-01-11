import { logger } from '@ritchy/logger'
import { and, eq, sql } from 'drizzle-orm'
import type { Request, Response } from 'express'
import { db } from '../../../db/db'
import { list, listPlace } from '../../../db/schema'
import { updateLastInteractionBatch } from '../../../services/places/utils/update_last_interaction'
import type {
  AddItemsApiResponse,
  AddItemsRequestBody,
  AddItemsRequestParams,
  AddItemsResponse,
} from './contract'

export const addItemsHandler = async (
  req: Request<AddItemsRequestParams, AddItemsResponse, AddItemsRequestBody>,
  res: Response<AddItemsApiResponse>,
): Promise<void> => {
  try {
    logger.info({
      msg: 'Adding items to list',
      event: 'add_items_to_list',
      metadata: {
        listId: req.params.id,
        items: req.body.items,
      },
    })
    const listId = req.params.id
    if (!listId) {
      res.status(400).json({
        error: 'Invalid list ID',
        message: 'Invalid list ID',
      })
      return
    }

    const userId = req.auth.userId
    const { items } = req.body

    // Verify list ownership
    const result = await db
      .select()
      .from(list)
      .where(and(eq(list.id, listId), eq(list.userId, userId)))
      .limit(1)

    if (!result.length) {
      res.status(404).json({
        error: 'List not found',
        message: 'List not found',
      })
      return
    }

    const upsertResults = await db
      .insert(listPlace)
      .values(
        items.map((item) => ({
          listId: listId,
          userPlaceId: item.userPlaceId,
        })),
      )
      .onConflictDoUpdate({
        target: [listPlace.listId, listPlace.userPlaceId],
        set: {
          updatedAt: new Date(),
        },
      })
      .returning({
        placeId: listPlace.userPlaceId,
        operation: sql`CASE WHEN xmax = 0 THEN 'insert' ELSE 'update' END`,
      })

    const newPlaceIds = upsertResults
      .filter((record) => record.operation === 'insert')
      .map((record) => record.placeId)

    const duplicatePlaceIds = upsertResults
      .filter((record) => record.operation === 'update')
      .map((record) => record.placeId)

    // Update last interaction for all affected places
    const allUserPlaceIds = items.map((item) => item.userPlaceId)
    await updateLastInteractionBatch(allUserPlaceIds)

    res.json({
      success: true,
      duplicates: duplicatePlaceIds.map(Number),
      added: newPlaceIds.map(Number),
    })
    logger.info({
      msg: 'Items added to list',
      event: 'items_added_to_list',
      metadata: {
        listId,
        added: newPlaceIds,
        duplicates: duplicatePlaceIds,
      },
    })
    return
  } catch (error) {
    logger.error({
      msg: 'Add items to list error',
      event: 'add_items_error',
      metadata: { error },
    })
    res.status(500).json({
      error: 'Failed to add items to list',
      message: 'Failed to add items to list',
    })
    return
  }
}
