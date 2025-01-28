import { logger } from '@ritchy/logger'
import type { NotesApiResponse } from '@ritchy/types'
import { desc, eq } from 'drizzle-orm'
import type { Request, Response } from 'express'
import { db } from '../../../db/db'
import { note } from '../../../db/schema'

export const getPlaceNotes = async (
  req: Request<{ placeId: string }>,
  res: Response<NotesApiResponse>,
): Promise<void> => {
  try {
    const notes = await db
      .select()
      .from(note)
      .where(eq(note.placeId, req.params.placeId))
      .orderBy(desc(note.createdAt))

    res.json(
      notes.map((n) => ({
        id: n.id,
        placeId: n.placeId,
        note: n.note,
        userId: n.userId,
        createdAt: n.createdAt.toISOString(),
        updatedAt: n.updatedAt.toISOString(),
      })),
    )
  } catch (error) {
    logger.error({
      msg: 'Get place notes error',
      event: 'get_place_notes_error',
      metadata: {
        error: error instanceof Error ? error : { error },
        placeId: req.params.placeId,
      },
    })
    res.status(500).json({
      error: 'Failed to get notes',
      message: 'Failed to get notes',
    })
  }
}
