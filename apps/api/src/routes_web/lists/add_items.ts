import { logger } from '@ritchy/logger'
import {
  type AddItemsToListApiResponse,
  type AddItemsToListRequestBody,
  AddItemsToListRequestBodySchema,
  type AddItemsToListRequestParams,
  type AddItemsToListResponse,
} from '@ritchy/types'
import { and, eq, inArray } from 'drizzle-orm'
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

    // Extract placeIds for checking duplicates
    const placeIds = items.map((item) => item.placeId)

    // First, get existing entries
    const existingEntries = await db
      .select()
      .from(listPlace)
      .where(
        and(eq(listPlace.listId, listId), inArray(listPlace.placeId, placeIds)),
      )

    const duplicatePlaceIds = existingEntries.map((entry) => entry.placeId)

    // Filter out duplicates
    const newItems = items.filter(
      (item) => !duplicatePlaceIds.includes(item.placeId),
    )

    // Only insert new items
    if (newItems.length > 0) {
      await db
        .insert(listPlace)
        .values(
          newItems.map((item) => ({
            listId: listId,
            placeId: item.placeId,
            searchId: item.searchId,
          })),
        )
        .onConflictDoUpdate({
          target: [listPlace.listId, listPlace.placeId],
          set: {
            updatedAt: new Date(),
          },
        })
    }

    // Update existing items with searchId if provided
    for (const item of items) {
      if (duplicatePlaceIds.includes(item.placeId) && item.searchId) {
        await db
          .update(listPlace)
          .set({ searchId: item.searchId })
          .where(
            and(
              eq(listPlace.listId, listId),
              eq(listPlace.placeId, item.placeId),
            ),
          )
      }
    }

    res.json({
      success: true,
      duplicates: duplicatePlaceIds.map(Number),
      added: newItems.map((item) => Number(item.placeId)),
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
