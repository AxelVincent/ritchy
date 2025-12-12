import { logger } from '@ritchy/logger'
import type { GetUserPlacesApiResponse, UserPlacesContext } from '@ritchy/types'
import { and, eq } from 'drizzle-orm'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { db } from '../../../db/db'
import { list, search } from '../../../db/schema'
import { getAggregatedUserPlaces } from '../../../services/places/queries/get_aggregated_user_places'
import { handleCacheMisses } from '../../../services/places/utils/handle-cache-misses'
import { populateSearchPlacesIfEmpty } from '../../../services/searches/populate-search-places'
import {
  UserPlacesQuerySchema,
  extractFilterParams,
  extractPaginationParams,
} from '../../../utils/filters/query-schema'
import { calculatePagination } from '../../../utils/pagination'

export const getUserPlaces = async (
  req: Request,
  res: Response<GetUserPlacesApiResponse>,
): Promise<void> => {
  const userId = req.auth.userId

  logger.info({
    msg: 'Get user places',
    event: 'get_user_places',
    metadata: {
      userId,
      query: req.query,
    },
  })

  try {
    // Parse query parameters using shared schema
    const queryResult = UserPlacesQuerySchema.safeParse(req.query)
    if (!queryResult.success) {
      logger.info({
        msg: 'Invalid query parameters',
        event: 'invalid_query_params',
        metadata: { errors: queryResult.error.errors },
      })
      res.status(400).json({
        error: 'Invalid query parameters',
        message: 'Invalid query parameters',
        details: queryResult.error.errors,
      })
      return
    }

    const query = queryResult.data
    const { listId, searchId } = query

    // Build context metadata
    let context: UserPlacesContext = { type: 'all' }

    // Verify ownership if scoped to list
    if (listId) {
      const listResult = await db
        .select()
        .from(list)
        .where(and(eq(list.id, listId), eq(list.userId, userId)))
        .limit(1)

      if (!listResult.length) {
        res.status(404).json({ error: 'List not found' })
        return
      }

      context = {
        type: 'list',
        listId,
        listName: listResult[0].name,
        listEmoji: listResult[0].emoji,
        listCreatedAt: listResult[0].createdAt.toISOString(),
        listUpdatedAt: listResult[0].updatedAt.toISOString(),
      }
    }

    // Verify ownership if scoped to search
    if (searchId) {
      const searchResult = await db
        .select()
        .from(search)
        .where(and(eq(search.id, searchId), eq(search.userId, userId)))
        .limit(1)

      if (!searchResult.length) {
        res.status(404).json({ error: 'Search not found' })
        return
      }

      // Populate search places if empty (fetches from Google Maps)
      await populateSearchPlacesIfEmpty(searchId, userId, {
        model: searchResult[0].model,
        keyword: searchResult[0].keyword,
        rectangle: searchResult[0].rectangle,
      })

      context = {
        type: 'search',
        searchId,
        searchKeyword: searchResult[0].keyword,
        searchModel: searchResult[0].model,
        searchCreatedAt: searchResult[0].createdAt.toISOString(),
      }
    }

    // Extract pagination and filter params using shared utilities
    const pagination = extractPaginationParams(query)
    const filters = extractFilterParams(query)

    // Get paginated and filtered results (listIds is now part of filters)
    const { items, total } = await getAggregatedUserPlaces({
      userId,
      listId,
      searchId,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
      pagination,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    })

    // Handle cache misses using shared utility
    const hadCacheMisses = await handleCacheMisses(items, {
      userId,
      listId,
      searchId,
    })

    if (hadCacheMisses) {
      // Re-fetch after refresh
      const refreshedResult = await getAggregatedUserPlaces({
        userId,
        listId,
        searchId,
        filters: Object.keys(filters).length > 0 ? filters : undefined,
        pagination,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      })

      res.json({
        items: refreshedResult.items,
        pagination: calculatePagination(pagination, refreshedResult.total),
        context,
      })
      return
    }

    res.json({
      items,
      pagination: calculatePagination(pagination, total),
      context,
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
      msg: 'Get user places error',
      event: 'get_user_places_error',
      metadata: { error },
    })
    res.status(500).json({
      error: 'Failed to get user places',
      message: 'Failed to get user places',
    })
  }
}
