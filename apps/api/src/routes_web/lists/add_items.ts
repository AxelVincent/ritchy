import { logger } from '@ritchy/logger'
import {
  type AddItemsToListRequestBody,
  AddItemsToListRequestBodySchema,
  type AddItemsToListRequestParams,
  AddItemsToListRequestSchema,
  type AddItemsToListResponse,
} from '@ritchy/types'
import { and, eq } from 'drizzle-orm'
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
  res: Response<AddItemsToListResponse>,
): Promise<void> => {
  try {
    const listId = Number.parseInt(req.params.id)
    if (Number.isNaN(listId)) {
      res.status(400).json({
        error: 'Invalid list ID',
      })
      return
    }

    const userId = req.auth.userId
    const parsedBody = AddItemsToListRequestBodySchema.parse(req.body)

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

    await db
      .insert(listPlace)
      .values(
        parsedBody.items.map((item) => ({
          listId: listId,
          placeId: item,
        })),
      )
      .onConflictDoNothing({ target: [listPlace.listId, listPlace.placeId] })

    res.json({ success: true })
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
      msg: 'Add items to list error',
      event: 'add_items_error',
      metadata: { error },
    })
    res.status(500).json({ error: 'Failed to add items to list' })
  }
}
