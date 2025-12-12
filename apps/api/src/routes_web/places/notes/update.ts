import { logger } from '@ritchy/logger'
import type { UpdateNoteApiResponse, UpdateNoteRequest } from '@ritchy/types'
import { and, eq } from 'drizzle-orm'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { db } from '../../../db/db'
import { note as noteTable } from '../../../db/schema'
import { updateLastInteraction } from '../../../services/places/utils/update_last_interaction'

export const updatePlaceNote = async (
  req: Request<UpdateNoteRequest>,
  res: Response<UpdateNoteApiResponse>,
): Promise<void> => {
  try {
    logger.info({
      msg: 'Updating place note',
      event: 'update_place_note',
      metadata: {
        userId: req.auth.userId,
        userPlaceId: req.params.userPlaceId,
        noteId: req.params.noteId,
      },
    })

    const { note } = req.body
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
        message: 'Note not found or you do not have permission to update it',
      })
      return
    }

    // Update the note
    const [updatedNote] = await db
      .update(noteTable)
      .set({
        note,
        updatedAt: new Date(),
      })
      .where(eq(noteTable.id, noteId))
      .returning()

    await updateLastInteraction(userPlaceId)

    res.json({
      id: updatedNote.id,
      userPlaceId: updatedNote.userPlaceId,
      note: updatedNote.note,
      userId: updatedNote.userId,
      createdAt: updatedNote.createdAt,
      updatedAt: updatedNote.updatedAt,
    })

    logger.info({
      msg: 'Place note updated',
      event: 'place_note_updated',
      metadata: {
        noteId,
        userPlaceId,
      },
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
      msg: 'Update place note error',
      event: 'update_place_note_error',
      metadata: {
        error: error instanceof Error ? error : { error },
        body: req.body,
        userId: req.auth.userId,
      },
    })
    res.status(500).json({
      error: 'Failed to update note',
      message: 'Failed to update note',
    })
    return
  }
}
