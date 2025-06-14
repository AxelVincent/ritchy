import { logger } from '@ritchy/logger'
import {
  type DeleteItemsFromListApiResponse,
  type DeleteItemsFromListRequestBody,
  DeleteItemsFromListRequestBodySchema,
  type DeleteItemsFromListRequestParams,
  type DeleteItemsFromListResponse,
} from '@ritchy/types'
import { and, eq, inArray } from 'drizzle-orm'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { db } from '../../db/db'
import { list, listPlace } from '../../db/schema'
import { createVersionedDbFromRequest } from '../../db/versioned_db/client'

export const deleteItemsFromList = async (
  req: Request<
    DeleteItemsFromListRequestParams,
    DeleteItemsFromListResponse,
    DeleteItemsFromListRequestBody
  >,
  res: Response<DeleteItemsFromListApiResponse>,
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
    const parsedBody = DeleteItemsFromListRequestBodySchema.parse(req.body)

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

    const versionedDb = createVersionedDbFromRequest(req)

    // Get the listPlace records to delete
    const listPlaces = await db
      .select()
      .from(listPlace)
      .where(
        and(
          eq(listPlace.listId, listId),
          inArray(listPlace.placeId, parsedBody.items),
        ),
      )

    // Delete with version history
    const { notFound } = await versionedDb.bulkDelete('listPlace', listPlaces, [
      'listId',
      'placeId',
    ])

    // Log any items that weren't found
    if (notFound.length > 0) {
      logger.info({
        msg: 'Some items were not found in the list',
        event: 'items_not_found',
        metadata: {
          listId,
          notFound,
        },
      })
    }

    res.json({
      success: true,
    })
    logger.info({
      msg: 'Items deleted from list',
      event: 'items_deleted_from_list',
      metadata: {
        listId,
        items: parsedBody.items,
      },
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
