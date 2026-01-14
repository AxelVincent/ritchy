import { logger } from '@ritchy/logger'
import { and, eq } from 'drizzle-orm'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { db } from '../../../db/db'
import { list, search } from '../../../db/schema'
import { getAggregatedUserPlaces } from '../../../services/places/queries/get_aggregated_user_places'
import { semanticSearchDomains } from '../../../services/places/queries/semantic_search_domains'
import { handleCacheMisses } from '../../../services/places/utils/handle-cache-misses'
import { populateSearchPlacesIfEmpty } from '../../../services/searches/populate-search-places'
import type { Place as PlaceApi } from '../../../shared'
import {
  extractFilterParams,
  extractPaginationParams,
} from '../../../utils/filters/query-schema'
import { calculatePagination } from '../../../utils/pagination'
import type { GetUserPlacesApiResponse, UserPlacesContext } from './contract'
import { UserPlacesQuerySchema } from './contract'

/**
 * Apply semantic search filter to places.
 * This is a "SQL First, Semantic Second" approach:
 * 1. First gets all places matching SQL filters
 * 2. Extracts domains from those places
 * 3. Runs semantic search only on those domains
 * 4. Filters and sorts results by semantic relevance
 */
const applySemanticFilter = async (
  items: PlaceApi[],
  semanticQuery: string,
  threshold: number | undefined,
  sortBy: string | undefined,
): Promise<{ items: PlaceApi[]; semanticApplied: boolean }> => {
  // Extract unique domains from places that have enrichment
  const domainsWithPlaces = new Map<string, PlaceApi[]>()
  for (const place of items) {
    const domain = place.enrichmentDomain
    if (domain) {
      const existing = domainsWithPlaces.get(domain) ?? []
      existing.push(place)
      domainsWithPlaces.set(domain, existing)
    }
  }

  const domains = Array.from(domainsWithPlaces.keys())

  if (domains.length === 0) {
    logger.info({
      msg: 'No domains found for semantic search',
      event: 'semantic_search_no_domains',
      metadata: { semanticQuery, totalPlaces: items.length },
    })
    // Return empty - no places have indexed content
    return { items: [], semanticApplied: true }
  }

  // Run semantic search on user's domains only
  const semanticResults = await semanticSearchDomains({
    query: semanticQuery,
    domains,
    threshold,
  })

  if (semanticResults.length === 0) {
    logger.info({
      msg: 'No semantic matches found',
      event: 'semantic_search_no_matches',
      metadata: { semanticQuery, domainsSearched: domains.length },
    })
    return { items: [], semanticApplied: true }
  }

  // Create score map for matching domains
  const domainScores = new Map(semanticResults.map((r) => [r.domain, r.score]))

  // Filter to only matching domains and add relevance scores
  const matchedItems: PlaceApi[] = []
  for (const [domain, places] of domainsWithPlaces.entries()) {
    const score = domainScores.get(domain)
    if (score !== undefined) {
      for (const place of places) {
        matchedItems.push({
          ...place,
          semanticRelevanceScore: score,
        })
      }
    }
  }

  // Sort by relevance if requested or by default when semantic filter is active
  if (sortBy === 'relevance' || !sortBy) {
    matchedItems.sort((a, b) => {
      const scoreA = a.semanticRelevanceScore ?? 0
      const scoreB = b.semanticRelevanceScore ?? 0
      return scoreB - scoreA // Descending
    })
  }

  logger.info({
    msg: 'Semantic search completed',
    event: 'semantic_search_applied',
    metadata: {
      semanticQuery,
      inputPlaces: items.length,
      domainsSearched: domains.length,
      matchingDomains: semanticResults.length,
      outputPlaces: matchedItems.length,
    },
  })

  return { items: matchedItems, semanticApplied: true }
}

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
    // Parse query parameters using local schema
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
      await populateSearchPlacesIfEmpty(searchId, userId)

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

    // Check if semantic search is requested
    const { semanticQuery, semanticThreshold, ...sqlFilters } = filters
    const hasSemanticFilter = !!semanticQuery

    if (hasSemanticFilter) {
      // SEMANTIC SEARCH FLOW: SQL First, Semantic Second
      // 1. Get ALL places matching SQL filters (no pagination yet)
      // NOTE: We omit pagination to get all results - getSafePaginationParams caps at 100
      const { items: allSqlItems } = await getAggregatedUserPlaces({
        userId,
        listId,
        searchId,
        filters:
          Object.keys(sqlFilters).length > 0
            ? (sqlFilters as typeof filters)
            : undefined,
        // No pagination - we need all results to apply semantic filter
        // Passing undefined bypasses the MAX_PAGE_SIZE=100 limit
        pagination: undefined,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      })

      // Handle cache misses
      const hadCacheMisses = await handleCacheMisses(allSqlItems, {
        userId,
        listId,
        searchId,
      })

      let itemsForSemanticSearch = allSqlItems
      if (hadCacheMisses) {
        const refreshedResult = await getAggregatedUserPlaces({
          userId,
          listId,
          searchId,
          filters:
            Object.keys(sqlFilters).length > 0
              ? (sqlFilters as typeof filters)
              : undefined,
          pagination: undefined,
          sortBy: query.sortBy,
          sortOrder: query.sortOrder,
        })
        itemsForSemanticSearch = refreshedResult.items
      }

      // 2. Apply semantic search filter
      const { items: semanticItems } = await applySemanticFilter(
        itemsForSemanticSearch,
        semanticQuery,
        semanticThreshold,
        query.sortBy,
      )

      // 3. Apply pagination to semantic-filtered results
      const startIndex = (pagination.page - 1) * pagination.pageSize
      const endIndex = startIndex + pagination.pageSize
      const paginatedItems = semanticItems.slice(startIndex, endIndex)

      res.json({
        items: paginatedItems,
        pagination: calculatePagination(pagination, semanticItems.length),
        context,
      })
      return
    }

    // STANDARD FLOW: No semantic search
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
