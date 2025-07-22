import { logger } from '@ritchy/logger'
import {
  type UpsertListApiResponse,
  type UpsertListRequest,
  UpsertListRequestSchema
} from '@ritchy/types'
import { and, eq } from 'drizzle-orm'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { db } from '../../db/db'
import { list } from '../../db/schema'
import { createVersionedDbFromRequest } from '../../db/versioned_db/client'

export const upsertList = async (
  req: Request<Record<string, never>, UpsertListApiResponse, UpsertListRequest>,
  res: Response<UpsertListApiResponse>
): Promise<void> => {
  logger.info({
    msg: 'Upserting list',
    event: 'upsert_list',
    metadata: {
      listId: req.body.id
    }
  })
  const userId = req.auth.userId
  try {
    const parsedBody = UpsertListRequestSchema.parse(req.body)
    let result: {
      id: string
      name: string
      emoji: string
      createdAt: Date
      updatedAt: Date
    }

    const versionedDb = createVersionedDbFromRequest(req)
    if (parsedBody.id) {
      const existingList = await db
        .select()
        .from(list)
        .where(and(eq(list.id, parsedBody.id), eq(list.userId, userId)))
        .limit(1)

      if (existingList.length === 0) {
        res.status(404).json({
          error: 'List not found',
          message: 'List not found or you do not have permission to update it'
        })
        return
      }

      const values = {
        name: parsedBody.name,
        emoji: parsedBody.emoji,
        userId: userId,
        updatedAt: new Date(),
        ...(parsedBody.id && { id: parsedBody.id })
      }

      const updateResult = await versionedDb.update('list', values, {
        id: parsedBody.id
      })

      result = updateResult
    } else {
      const createResult = await versionedDb.insert('list', {
        name: parsedBody.name,
        emoji: parsedBody.emoji,
        userId: userId
      })

      result = createResult
    }

    res.json({
      id: String(result.id),
      name: result.name,
      emoji: result.emoji,
      createdAt: result.createdAt.toISOString(),
      updatedAt: result.updatedAt.toISOString()
    })
    logger.info({
      msg: 'List upserted',
      event: 'list_upserted',
      metadata: {
        listId: result.id
      }
    })
    return
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.info({
        msg: 'Validation error',
        event: 'validation_error',
        metadata: { error }
      })
      res.status(400).json({
        error: 'Invalid request data',
        message: 'Invalid request data',
        details: error.errors
      })
      return
    }

    logger.error({
      msg: 'Create or update list error',
      event: 'create_or_update_list_error',
      metadata: {
        error:
          error instanceof Error
            ? {
                message: error.message,
                name: error.name,
                stack: error.stack
              }
            : error,
        body: req.body,
        userId: userId
      }
    })
    res.status(500).json({
      error: 'Failed to create or update list',
      message: 'Failed to create or update list'
    })
    return
  }
}
