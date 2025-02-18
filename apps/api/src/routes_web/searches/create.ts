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
  try {
    const parsedBody = CreateSearchRequestBodySchema.parse(req.body)
    const plan = await getUserPlan(req.auth.userId)

    const radiusLimit = PLAN_RADIUS_LIMITS[plan]
    if (parsedBody.radiusInMeters > radiusLimit) {
      res.status(403).json({
        error: 'Radius limit exceeded',
        message: `${plan} plan users are limited to a ${radiusLimit}m search radius`,
      })
      return
    }
    
    if (plan === 'FREE' && parsedBody.model === 'DEFAULT') {
      const searchCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(search)
        .where(and(eq(search.userId, req.auth.userId)))
        .then((result) => Number(result[0].count))

      if (searchCount >= 3) {
        res.status(403).json({
          error: 'Search limit reached',
          message:
            'Free plan users are limited to 3 DEFAULT searches. Please upgrade your plan for unlimited searches.',
        })
        return
      }
    }

    if (!hasModelAccess(plan as PlanType, parsedBody.model)) {
      res.status(403).json({
        error: 'Forbidden',
        message: `This feature is only available for ${parsedBody.model} and above users`,
      })
      return
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

    res.json({
      id: result.id,
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
    return
  }
}
