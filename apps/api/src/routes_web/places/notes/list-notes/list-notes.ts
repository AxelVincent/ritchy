import { logger } from '@ritchy/logger'
import { desc, eq } from 'drizzle-orm'
import type { Request, Response } from 'express'
import { db } from '../../../../db/db'
import { note } from '../../../../db/schema'
import type { ListNotesApiResponse, ListNotesParams } from './contract'
import { ListNotesParamsSchema } from './contract'

export const listNotesHandler = async (
  req: Request<ListNotesParams>,
  res: Response<ListNotesApiResponse>,
): Promise<void> => {
  try {
    logger.info({
      msg: 'Getting place notes',
      event: 'get_place_notes',
      metadata: {
        userPlaceId: req.params.userPlaceId,
      },
    })
    const paramsParse = ListNotesParamsSchema.parse({
      userPlaceId: req.params.userPlaceId,
    })

    const notes = await db
      .select()
      .from(note)
      .where(eq(note.userPlaceId, paramsParse.userPlaceId))
      .orderBy(desc(note.createdAt))

    res.json(
      notes.map((n) => ({
        id: n.id,
        userPlaceId: n.userPlaceId,
        note: n.note,
        userId: n.userId,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
      })),
    )

    logger.info({
      msg: 'Place notes retrieved',
      event: 'place_notes_retrieved',
      metadata: {
        userPlaceId: req.params.userPlaceId,
      },
    })
    return
  } catch (error) {
    logger.error({
      msg: 'Get place notes error',
      event: 'get_place_notes_error',
      metadata: {
        error: error instanceof Error ? error : { error },
        userPlaceId: req.params.userPlaceId,
      },
    })
    res.status(500).json({
      error: 'Failed to get notes',
      message: 'Failed to get notes',
    })
    return
  }
}
