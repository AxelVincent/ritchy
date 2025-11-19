import { logger } from '@ritchy/logger'
import type { DeleteNoteApiResponse, DeleteNoteRequest } from '@ritchy/types'
import { and, eq } from 'drizzle-orm'
import type { Request, Response } from 'express'
import { db } from '../../../db/db'
import { note as noteTable } from '../../../db/schema'

export const deletePlaceNote = async (
  req: Request<DeleteNoteRequest>,
  res: Response<DeleteNoteApiResponse>,
): Promise<void> => {
  try {
    logger.info({
      msg: 'Deleting place note',
      event: 'delete_place_note',
      metadata: {
        userId: req.auth.userId,
        userPlaceId: req.params.userPlaceId,
        noteId: req.params.noteId,
      },
    })

    const { userPlaceId, noteId } = req.params

    // First check if the note exists and belongs to the user
    const existingNote = await db
      .select()
      .from(noteTable)
      .where(
        and(
          eq(noteTable.id, noteId),
          eq(noteTable.userPlaceId, userPlaceId),
          eq(noteTable.userId, req.auth.userId),
        ),
      )
      .limit(1)

    if (existingNote.length === 0) {
      logger.warn({
        msg: 'Note not found or unauthorized',
        event: 'note_not_found',
        metadata: {
          userId: req.auth.userId,
          noteId,
        },
      })
      res.status(404).json({
        error: 'Note not found',
        message: 'Note not found or you do not have permission to delete it',
      })
      return
    }

    // Delete the note
    await db.delete(noteTable).where(eq(noteTable.id, noteId))

    res.json({ success: true })

    logger.info({
      msg: 'Place note deleted',
      event: 'place_note_deleted',
      metadata: {
        noteId,
        userPlaceId,
      },
    })
    return
  } catch (error) {
    logger.error({
      msg: 'Delete place note error',
      event: 'delete_place_note_error',
      metadata: {
        error: error instanceof Error ? error : { error },
        userId: req.auth.userId,
      },
    })
    res.status(500).json({
      error: 'Failed to delete note',
      message: 'Failed to delete note',
    })
    return
  }
}
