import { logger } from '@ritchy/logger'
import { and, eq } from 'drizzle-orm'
import type { Request, Response } from 'express'
import { db } from '../../../db/db'
import { list, search, userPlace } from '../../../db/schema'
import { getFilteredPlaceIds } from '../../../services/places/queries/get_aggregated_user_places'
import { extractFilterParams } from '../../../shared'
import type {
  GetUserPlaceItemPageQuery,
  GetUserPlacePageApiResponse,
} from './contract'
import { GetUserPlaceItemPageQuerySchema } from './contract'

/**
 * Get the page number and index of a specific item within the filtered/sorted results.
 * Used for navigating to an item when clicking a map marker.
 */
export const getItemPage = async (
  req: Request<{ itemId: string }>,
  res: Response<GetUserPlacePageApiResponse>,
): Promise<void> => {
  const userId = req.auth.userId
  const { itemId } = req.params

  logger.info({
    msg: 'Get item page',
    event: 'get_item_page',
    metadata: { userId, itemId, query: req.query },
  })

  try {
    // Parse query parameters using local schema
    const queryResult = GetUserPlaceItemPageQuerySchema.safeParse(req.query)
    if (!queryResult.success) {
      res.status(400).json({
        error: 'Invalid query parameters',
      })
      return
    }

    const query = queryResult.data
    const { listId, searchId } = query
    const pageSize = query.pageSize ?? 50

    // Extract filters using shared utility (includes listIds)
    const filters = extractFilterParams(query)

    // Verify item ownership
    const itemResult = await db
      .select()
      .from(userPlace)
      .where(and(eq(userPlace.id, itemId), eq(userPlace.user_id, userId)))
      .limit(1)

    if (!itemResult.length) {
      res.status(404).json({ error: 'Item not found' })
      return
    }

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
    }

    // Get all filtered place IDs in order
    const allIds = await getFilteredPlaceIds({
      userId,
      listId,
      searchId,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    })

    // Find the index of the requested item
    const index = allIds.indexOf(itemId)

    if (index === -1) {
      // Item not found in filtered results - it might be filtered out
      res.status(404).json({
        error: 'Item not found in current filter results',
      })
      return
    }

    // Calculate page number (1-indexed)
    const page = Math.floor(index / pageSize) + 1

    res.json({
      page,
      index: index % pageSize, // Index within the page
    })
  } catch (error) {
    logger.error({
      msg: 'Get item page error',
      event: 'get_item_page_error',
      metadata: { error },
    })
    res.status(500).json({
      error: 'Failed to get item page',
    })
  }
}
