import { logger } from '@ritchy/logger'
import type { AddNoteApiResponse, AddNoteRequest } from '@ritchy/types'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { db } from '../../../db/db'
import { note as noteTable } from '../../../db/schema'
import { updateLastInteraction } from '../../../services/places/utils/update_last_interaction'

export const addPlaceNote = async (
  req: Request<AddNoteRequest>,
  res: Response<AddNoteApiResponse>,
): Promise<void> => {
  try {
    logger.info({
      msg: 'Adding place note',
      event: 'add_place_note',
      metadata: {
        userId: req.auth.userId,
        userPlaceId: req.params.userPlaceId,
        note: req.body.note,
      },
    })
    const { note } = req.body
    const { userPlaceId } = req.params

    const [result] = await db
      .insert(noteTable)
      .values({
        userPlaceId,
        note,
        userId: req.auth.userId,
      })
      .returning()

    await updateLastInteraction(userPlaceId)

    res.json({
      id: result.id,
      userPlaceId: result.userPlaceId,
      note: result.note,
      userId: result.userId,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    })

    logger.info({
      msg: 'Place note added',
      event: 'place_note_added',
      metadata: {
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
    return
  }
}
