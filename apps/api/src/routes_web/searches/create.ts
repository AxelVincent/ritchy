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
import { db } from '../../db/db'
import { search } from '../../db/schema'
import { getUserPlan } from '../../services/subscription'
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
    user: { id: req.auth.userId },
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
      user: { id: req.auth.userId },
      metadata: {
        plan,
        model: parsedBody.model,
        requestedRadius: parsedBody.radiusInMeters,
      },
    })

    const radiusLimit = PLAN_RADIUS_LIMITS[plan]
    if (parsedBody.radiusInMeters > radiusLimit) {
      logger.warn({
        msg: 'Search radius limit exceeded',
        event: 'search_radius_exceeded',
        user: { id: req.auth.userId },
        metadata: {
          plan,
          requestedRadius: parsedBody.radiusInMeters,
          radiusLimit,
        },
      })
      res.status(403).json({
        error: 'Radius limit exceeded',
        message: `${plan} plan users are limited to a ${radiusLimit}m search radius`,
      })
      return
    }

    if (
      !hasModelAccess(plan as PlanType, parsedBody.model) &&
      !(plan === 'FREE' && parsedBody.model === 'DEFAULT')
    ) {
      logger.warn({
        msg: 'Model access denied',
        event: 'search_model_access_denied',
        user: { id: req.auth.userId },
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

    if (plan === 'FREE' && parsedBody.model === 'DEFAULT') {
      const searchCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(search)
        .where(and(eq(search.userId, req.auth.userId)))
        .then((result) => Number(result[0].count))

      logger.info({
        msg: 'Free plan search count checked',
        event: 'search_count_checked',
        user: { id: req.auth.userId },
        metadata: {
          currentSearchCount: searchCount,
          limit: 3,
        },
      })

      if (searchCount >= 3) {
        logger.warn({
          msg: 'Free plan search limit reached',
          event: 'search_limit_reached',
          user: { id: req.auth.userId },
          metadata: {
            searchCount,
            limit: 3,
          },
        })
        res.status(403).json({
          error: 'Search limit reached',
          message:
            'Free plan users are limited to 3 DEFAULT searches. Please upgrade your plan for unlimited searches.',
        })
        return
      }
    }

    const [result] = await db
      .insert(search)
      .values({
        userId: req.auth.userId,
        latitude: parsedBody.location.latitude.toString(),
        longitude: parsedBody.location.longitude.toString(),
        radiusInMeters: parsedBody.radiusInMeters,
        placeName: parsedBody.placeName,
        keyword: parsedBody.keyword,
        model: parsedBody.model,
      })
      .returning({ id: search.id })

    logger.info({
      msg: 'Search created successfully',
      event: 'search_created',
      user: { id: req.auth.userId },
      metadata: {
        searchId: result.id,
        plan,
        model: parsedBody.model,
        location: {
          latitude: parsedBody.location.latitude,
          longitude: parsedBody.location.longitude,
        },
        radiusInMeters: parsedBody.radiusInMeters,
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
        user: { id: req.auth.userId },
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
      user: { id: req.auth.userId },
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
