import { logger } from '@ritchy/logger'
import {
  type CreateSearchApiResponse,
  type CreateSearchRequestBody,
  CreateSearchRequestBodySchema,
  hasModelAccess,
} from '@ritchy/types'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { db } from '../../db/db'
import { search } from '../../db/schema'
import { getUserCredits } from '../../services/payment/queries/get_user_credits'
import { getUserSearchModel } from '../../services/payment/queries/get_user_search_model'

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
    const userSearchModel = await getUserSearchModel(req.auth.userId)

    logger.info({
      msg: 'Search request validated',
      event: 'search_validation_passed',
      metadata: {
        userSearchModel,
        requestedModel: parsedBody.model,
      },
    })

    // Check if user's search model allows the requested model
    if (!hasModelAccess(userSearchModel, parsedBody.model)) {
      logger.warn({
        msg: 'Model access denied',
        event: 'search_model_access_denied',
        metadata: {
          userSearchModel,
          requestedModel: parsedBody.model,
        },
      })
      res.status(403).json({
        error: 'Forbidden',
        message: `Your current subscription allows up to ${userSearchModel} searches. Please upgrade to access ${parsedBody.model} searches.`,
      })
      return
    }

    const userCredits = await getUserCredits(req.auth.userId)

    if (userCredits.search <= 0) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You have no credits left. Please upgrade your plan.',
      })
      return
    }

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
        userSearchModel,
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
