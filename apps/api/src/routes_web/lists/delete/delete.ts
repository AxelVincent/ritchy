import { logger } from '@ritchy/logger'
import { and, eq } from 'drizzle-orm'
import type { Request, Response } from 'express'
import { db } from '../../../db/db'
import { list, listPlace } from '../../../db/schema'
import type { DeleteListApiResponse, DeleteListRequestParams } from './contract'

export const deleteListHandler = async (
  req: Request<DeleteListRequestParams>,
  res: Response<DeleteListApiResponse>,
): Promise<void> => {
  try {
    logger.info({
      msg: 'Deleting list',
      event: 'delete_list',
      metadata: {
        listId: req.params.id,
      },
    })
    const listId = req.params.id
    if (Number.isNaN(listId)) {
      res.status(400).json({
        error: 'Invalid list ID',
        message: 'Invalid list ID',
      })
      return
    }

    const userId = req.auth.userId

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

    await db.transaction(async (tx) => {
      await tx.delete(listPlace).where(eq(listPlace.listId, listId))
      await tx.delete(list).where(eq(list.id, listId))
    })

    res.json({ success: true })
    logger.info({
      msg: 'List deleted',
      event: 'list_deleted',
      metadata: {
        listId,
      },
    })
    return
  } catch (error) {
    logger.error({
      msg: 'Delete list error',
      event: 'delete_list_error',
      metadata: { error },
    })
    res.status(500).json({
      error: 'Failed to delete list',
      message: 'Failed to delete list',
    })
    return
  }
}
