import { logger } from '@ritchy/logger'
import {
  type CreateSearchApiResponse,
  type CreateSearchRequestBody,
  CreateSearchRequestBodySchema,
} from '@ritchy/types'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { db } from '../../db/db'
import { search } from '../../db/schema'

export const createSearch = async (
  req: Request<
    Record<string, never>,
    CreateSearchApiResponse,
    CreateSearchRequestBody
  >,
  res: Response<CreateSearchApiResponse>,
): Promise<void> => {
  logger.info({
    msg: 'Search creation initiated',
    event: 'search_creation_started',
    metadata: {
      requestBody: req.body,
    },
  })

  try {
    const parsedBody = CreateSearchRequestBodySchema.parse(req.body)

    logger.info({
      msg: 'Search request validated',
      event: 'search_validation_passed',
      metadata: {
        requestedModel: parsedBody.model,
      },
    })

    const [result] = await db
      .insert(search)
      .values({
        userId: req.auth.userId,
        placeName: parsedBody.placeName,
        keyword: parsedBody.keyword,
        model: parsedBody.model,
        rectangle: parsedBody.rectangle,
      })
      .returning({
        id: search.id,
      })

    logger.info({
      msg: 'Search created successfully',
      event: 'search_created',
      metadata: {
        searchId: result.id,
        requestedModel: parsedBody.model,
        rectangle: parsedBody.rectangle,
      },
    })

    res.json({
      id: result.id,
    })
    return
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.info({
        msg: 'Search validation error',
        event: 'search_validation_error',
        metadata: {
          validationErrors: error.errors,
          requestBody: req.body,
        },
      })
      res.status(400).json({
        error: 'Invalid request data',
        message: 'Invalid request data',
      })
      return
    }

    logger.error({
      msg: 'Search creation failed',
      event: 'search_creation_error',
      metadata: {
        error:
          error instanceof Error
            ? {
                message: error.message,
                name: error.name,
                stack: error.stack,
              }
            : error,
        requestBody: req.body,
      },
    })
    res.status(500).json({
      error: 'Failed to create search',
      message: 'Failed to create search',
    })
    return
  }
}
