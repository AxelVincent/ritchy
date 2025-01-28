import { logger } from '@ritchy/logger'
import type { GetSearchesApiResponse } from '@ritchy/types'
import { eq } from 'drizzle-orm'
import type { Request, Response } from 'express'
import { db } from '../../db/db'
import { search } from '../../db/schema'

export const getSearches = async (
  req: Request,
  res: Response<GetSearchesApiResponse>,
): Promise<void> => {
  try {
    const userId = req.auth.userId

    const result = await db
      .select()
      .from(search)
      .where(eq(search.userId, userId))

    res.json({
      searches: result.map((search) => ({
        id: search.id,
        model: search.model,
        keyword: search.keyword,
        locationFormatted: search.placeName,
        createdAt: search.createdAt,
        updatedAt: search.updatedAt,
      })),
    })
  } catch (error) {
    logger.error({
      msg: 'Get searches error',
      event: 'get_searches_error',
      metadata: { error },
    })
  }
}
