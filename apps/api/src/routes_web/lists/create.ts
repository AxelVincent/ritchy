import { logger } from '@ritchy/logger'
import {
  type CreateListApiResponse,
  type CreateListRequest,
  CreateListRequestSchema,
} from '@ritchy/types'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { db } from '../../db/db'
import { list } from '../../db/schema'

export const createList = async (
  req: Request<Record<string, never>, CreateListApiResponse, CreateListRequest>,
  res: Response<CreateListApiResponse>,
): Promise<void> => {
  try {
    const parsedBody = CreateListRequestSchema.parse(req.body)

    const [result] = await db
      .insert(list)
      .values({
        name: parsedBody.name,
        emoji: parsedBody.emoji,
        userId: req.auth.userId,
      })
      .returning({
        id: list.id,
        name: list.name,
        emoji: list.emoji,
        createdAt: list.createdAt,
        updatedAt: list.updatedAt,
      })

    res.json({
      id: String(result.id),
      name: result.name,
      emoji: result.emoji,
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
        details: error.errors,
      })
      return
    }

    logger.error({
      msg: 'Create list error',
      event: 'create_list_error',
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
        userId: req.auth.userId,
      },
    })
    res.status(500).json({ error: 'Failed to create list' })
  }
}
