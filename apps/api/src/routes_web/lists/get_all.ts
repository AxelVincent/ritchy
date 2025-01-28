import { logger } from '@ritchy/logger'
import type { ListsApiResponse } from '@ritchy/types'
import { asc, eq, sql } from 'drizzle-orm'
import type { Request, Response } from 'express'
import { db } from '../../db/db'
import { list, listPlace } from '../../db/schema'

export const getLists = async (
  req: Request,
  res: Response<ListsApiResponse>,
): Promise<void> => {
  try {
    const lists = await db
      .select({
        id: list.id,
        name: list.name,
        emoji: list.emoji,
        itemCount: sql<number>`count(${listPlace.id})::int`,
        createdAt: list.createdAt,
        updatedAt: list.updatedAt,
      })
      .from(list)
      .leftJoin(listPlace, eq(listPlace.listId, list.id))
      .where(eq(list.userId, req.auth.userId))
      .orderBy(asc(list.updatedAt))
      .groupBy(list.id)

    res.json(
      lists.map((list) => ({
        ...list,
        id: String(list.id),
        createdAt: list.createdAt.toISOString(),
        updatedAt: list.updatedAt.toISOString(),
      })),
    )
  } catch (error) {
    logger.error({
      msg: 'Get lists error',
      event: 'get_lists_error',
      metadata: { error },
    })
    res.status(500).json({
      error: 'Failed to fetch lists',
      message: 'Failed to fetch lists',
    })
  }
}
