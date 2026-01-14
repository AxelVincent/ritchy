import { logger } from '@ritchy/logger'
import { and, eq } from 'drizzle-orm'
import type { Request, Response } from 'express'
import { db } from '../../../db/db'
import { list } from '../../../db/schema'
import type { CreateListApiResponse, CreateListRequest } from './contract'

export const createListHandler = async (
  req: Request<Record<string, never>, CreateListApiResponse, CreateListRequest>,
  res: Response<CreateListApiResponse>,
): Promise<void> => {
  logger.info({
    msg: 'Upserting list',
    event: 'upsert_list',
    metadata: {
      listId: req.body.id,
    },
  })
  const userId = req.auth.userId
  try {
    const parsedBody = req.body
    let result: {
      id: string
      name: string
      emoji: string
      createdAt: Date
      updatedAt: Date
    }

    if (parsedBody.id) {
      const existingList = await db
        .select()
        .from(list)
        .where(and(eq(list.id, parsedBody.id), eq(list.userId, userId)))
        .limit(1)

      if (existingList.length === 0) {
        res.status(404).json({
          error: 'List not found',
          message: 'List not found or you do not have permission to update it',
        })
        return
      }

      const values = {
        name: parsedBody.name,
        emoji: parsedBody.emoji,
        userId: userId,
        updatedAt: new Date(),
        ...(parsedBody.id && { id: parsedBody.id }),
      }

      const [updateResult] = await db
        .update(list)
        .set(values)
        .where(eq(list.id, parsedBody.id))
        .returning({
          id: list.id,
          name: list.name,
          emoji: list.emoji,
          createdAt: list.createdAt,
          updatedAt: list.updatedAt,
        })

      result = updateResult
    } else {
      const [createResult] = await db
        .insert(list)
        .values({
          name: parsedBody.name,
          emoji: parsedBody.emoji,
          userId: userId,
        })
        .returning({
          id: list.id,
          name: list.name,
          emoji: list.emoji,
          createdAt: list.createdAt,
          updatedAt: list.updatedAt,
        })

      result = createResult
    }

    res.json({
      id: String(result.id),
      name: result.name,
      emoji: result.emoji,
      createdAt: result.createdAt.toISOString(),
      updatedAt: result.updatedAt.toISOString(),
    })
    logger.info({
      msg: 'List upserted',
      event: 'list_upserted',
      metadata: {
        listId: result.id,
      },
    })
    return
  } catch (error) {
    logger.error({
      msg: 'Create or update list error',
      event: 'create_or_update_list_error',
      metadata: {
        error:
          error instanceof Error
            ? {
                message: error.message,
                name: error.name,
                stack: error.stack,
              }
            : error,
        body: req.body,
        userId: userId,
      },
    })
    res.status(500).json({
      error: 'Failed to create or update list',
      message: 'Failed to create or update list',
    })
    return
  }
}
