import {
  type CreateSearchApiResponse,
  type CreateSearchRequestBody,
  CreateSearchRequestBodySchema,
} from '@ritchy/types'
import type { Request, Response } from 'express'
import { logger } from 'packages/logger/dist'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'

export const createSearch = async (
  req: Request<
    Record<string, never>,
    CreateSearchApiResponse,
    CreateSearchRequestBody
  >,
  res: Response<CreateSearchApiResponse>,
): Promise<void> => {
  try {
    const parsedBody = CreateSearchRequestBodySchema.parse(req.body)

    console.log('parsedBody: ', parsedBody)

    const id = uuidv4()

    res.json({
      id,
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
      })
      return
    }

    logger.error({
      msg: 'Create search error',
      event: 'create_search_error',
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
    res.status(500).json({
      error: 'Failed to create search',
      message: 'Failed to create search',
    })
  }
}
