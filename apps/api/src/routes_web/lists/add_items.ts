import { logger } from '@ritchy/logger'
import {
  type AddItemsToListApiResponse,
  type AddItemsToListRequestBody,
  AddItemsToListRequestBodySchema,
  type AddItemsToListRequestParams,
  type AddItemsToListResponse,
} from '@ritchy/types'
import { and, eq, sql } from 'drizzle-orm'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { db } from '../../db/db'
import { listPlace } from '../../db/schema'
import { list } from '../../db/schema'

export const addItemsToList = async (
  req: Request<
    AddItemsToListRequestParams,
    AddItemsToListResponse,
    AddItemsToListRequestBody
  >,
  res: Response<AddItemsToListApiResponse>,
): Promise<void> => {
  try {
    const listId = req.params.id
    if (!listId) {
      res.status(400).json({
        error: 'Invalid list ID',
        message: 'Invalid list ID',
      })
      return
    }

    const userId = req.auth.userId
    const parsedBody = AddItemsToListRequestBodySchema.parse(req.body)
    const { items } = parsedBody

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

    // Use a single upsert operation with returning clause
    const upsertResult = await db
      .insert(listPlace)
      .values(
        items.map((item) => ({
          listId: listId,
          placeId: item.placeId,
          searchId: item.searchId,
        })),
      )
      .onConflictDoUpdate({
        target: [listPlace.listId, listPlace.placeId],
        set: {
          searchId: sql`EXCLUDED.search_id`,
          updatedAt: new Date(),
        },
      })
      .returning({
        placeId: listPlace.placeId,
        // Add a column to indicate if this was an insert or update
        // This is PostgreSQL-specific syntax
        operation: sql`CASE WHEN xmax = 0 THEN 'insert' ELSE 'update' END`,
      })

    // Separate the results into new and duplicate items
    const newPlaceIds = upsertResult
      .filter((row) => row.operation === 'insert')
      .map((row) => row.placeId)

    const duplicatePlaceIds = upsertResult
      .filter((row) => row.operation === 'update')
      .map((row) => row.placeId)

    res.json({
      success: true,
      duplicates: duplicatePlaceIds.map(Number),
      added: newPlaceIds.map(Number),
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
