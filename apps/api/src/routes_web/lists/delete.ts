import { logger } from '@ritchy/logger'
import type {
  DeleteListApiResponse,
  DeleteListRequestParams,
} from '@ritchy/types'
import { and, eq } from 'drizzle-orm'
import type { Request, Response } from 'express'
import { db } from '../../db/db'
import { list } from '../../db/schema'
import {
  createVersionedDbFromRequest,
} from '../../db/versioned_db/client'

export const deleteList = async (
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

    const versionedDb = createVersionedDbFromRequest(req)
    await versionedDb.transaction(async (ops) => {
      await ops.bulkDelete('listPlace', [{ listId }], ['listId'], ops.db)
      await ops.delete('list', { id: listId }, ops.db)
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
