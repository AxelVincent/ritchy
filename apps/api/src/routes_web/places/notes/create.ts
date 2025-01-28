import { logger } from '@ritchy/logger'
import { type AddNoteApiResponse, AddNoteRequestSchema } from '@ritchy/types'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { db } from '../../../db/db'
import { note } from '../../../db/schema'

export const addPlaceNote = async (
  req: Request<{ placeId: string }, AddNoteApiResponse, { note: string }>,
  res: Response<AddNoteApiResponse>,
): Promise<void> => {
  try {
    const parsedBody = AddNoteRequestSchema.parse({
      placeId: req.params.placeId,
      note: req.body.note,
    })

    const [result] = await db
      .insert(note)
      .values({
        placeId: parsedBody.placeId,
        note: parsedBody.note,
        userId: req.auth.userId,
      })
      .returning()

    res.json({
      id: result.id,
      placeId: result.placeId,
      note: result.note,
      userId: result.userId,
      createdAt: result.createdAt.toISOString(),
      updatedAt: result.updatedAt.toISOString(),
    })
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
      msg: 'Add place note error',
      event: 'add_place_note_error',
      metadata: {
        error: error instanceof Error ? error : { error },
        body: req.body,
        userId: req.auth.userId,
      },
    })
    res.status(500).json({
      error: 'Failed to add note',
      message: 'Failed to add note',
    })
  }
}
