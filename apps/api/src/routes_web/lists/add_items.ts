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
import { createVersionedDb } from '../../db/client'
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

    const versionedDb = createVersionedDb(req)
    const { records, operations } = await versionedDb.bulkUpsert(
      'listPlace',
      items.map((item) => ({
        listId: listId,
        placeId: item.placeId,
        searchId: item.searchId,
      })),
      ['listId', 'placeId'],
    )

    const newPlaceIds = records
      .filter((record) => operations[record.id] === 'insert')
      .map((record) => record.placeId)

    const duplicatePlaceIds = records
      .filter((record) => operations[record.id] === 'update')
      .map((record) => record.placeId)

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
