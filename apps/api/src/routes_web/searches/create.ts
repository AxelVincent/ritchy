import { logger } from '@ritchy/logger'
import {
  type CreateSearchApiResponse,
  type CreateSearchRequestBody,
  CreateSearchRequestBodySchema,
  PLAN_RADIUS_LIMITS,
} from '@ritchy/types'
import { and, eq, sql } from 'drizzle-orm'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { createVersionedDb } from '../../db/client'
import { db } from '../../db/db'
import { search } from '../../db/schema'
import { getUserPlan } from '../../services/subscription'
import { getLargestSquareFromCoordinates } from '../../utils/geo_utils'
import { type PlanType, hasModelAccess } from '../../utils/plan-access'

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
    const plan = await getUserPlan(req.auth.userId)

    logger.info({
      msg: 'Search request validated',
      event: 'search_validation_passed',

      metadata: {
        plan,
        model: parsedBody.model,
      },
    })

    if (
      !hasModelAccess(plan as PlanType, parsedBody.model) &&
      !(plan === 'FREE' && parsedBody.model === 'ESSENTIALS')
    ) {
      logger.warn({
        msg: 'Model access denied',
        event: 'search_model_access_denied',
        metadata: {
          plan,
          requestedModel: parsedBody.model,
        },
      })
      res.status(403).json({
        error: 'Forbidden',
        message: `This feature is only available for ${parsedBody.model} and above users`,
      })
      return
    }

    if (plan === 'FREE' && parsedBody.model === 'ESSENTIALS') {
      const searchCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(search)
        .where(and(eq(search.userId, req.auth.userId)))
        .then((result) => Number(result[0].count))

      logger.info({
        msg: 'Free plan search count checked',
        event: 'search_count_checked',
        metadata: {
          currentSearchCount: searchCount,
          limit: 3,
        },
      })

      if (searchCount >= 3) {
        logger.warn({
          msg: 'Free plan search limit reached',
          event: 'search_limit_reached',
          metadata: {
            searchCount,
            limit: 3,
          },
        })
        res.status(403).json({
          error: 'Search limit reached',
          message:
            'Free plan users are limited to 3 ESSENTIALS searches. Please upgrade your plan for unlimited searches.',
        })
        return
      }
    }

    const versionedDb = createVersionedDb(req)
    const result = await versionedDb.insert('search', {
      userId: req.auth.userId,
      placeName: parsedBody.placeName,
      keyword: parsedBody.keyword,
      model: parsedBody.model,
      rectangle: parsedBody.rectangle,
    })

    logger.info({
      msg: 'Search created successfully',
      event: 'search_created',
      metadata: {
        searchId: result.id,
        plan,
        model: parsedBody.model,
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
