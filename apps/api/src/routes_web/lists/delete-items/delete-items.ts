import { logger } from '@ritchy/logger'
import { and, eq, inArray } from 'drizzle-orm'
import type { Request, Response } from 'express'
import { db } from '../../../db/db'
import { list, listPlace } from '../../../db/schema'
import { updateLastInteractionBatch } from '../../../services/places/utils/update_last_interaction'
import type {
  DeleteItemsApiResponse,
  DeleteItemsRequestBody,
  DeleteItemsRequestParams,
  DeleteItemsResponse,
} from './contract'

export const deleteItemsHandler = async (
  req: Request<
    DeleteItemsRequestParams,
    DeleteItemsResponse,
    DeleteItemsRequestBody
  >,
  res: Response<DeleteItemsApiResponse>,
): Promise<void> => {
  try {
    logger.info({
      msg: 'Deleting items from list',
      event: 'delete_items_from_list',
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

    await db
      .delete(listPlace)
      .where(
        and(
          eq(listPlace.listId, listId),
          inArray(listPlace.userPlaceId, items),
        ),
      )

    // Update last interaction for all affected places
    await updateLastInteractionBatch(items)

    res.json({
      success: true,
    })
    logger.info({
      msg: 'Items deleted from list',
      event: 'items_deleted_from_list',
      metadata: {
        listId,
        items,
      },
    })
    return
  } catch (error) {
    logger.error({
      msg: 'Delete items from list error',
      event: 'delete_items_error',
      metadata: { error },
    })
    res.status(500).json({
      error: 'Failed to delete items from list',
      message: 'Failed to delete items from list',
    })
    return
  }
}
