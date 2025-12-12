import { logger } from '@ritchy/logger'
import type { GetUserPlaceMarkersApiResponse } from '@ritchy/types'
import { type SQL, and, eq, sql } from 'drizzle-orm'
import type { Request, Response } from 'express'
import { db } from '../../../db/db'
import { list, search } from '../../../db/schema'
import { buildPlaceFilterConditions } from '../../../utils/filters/place-filters'
import {
  UserPlacesQuerySchema,
  extractFilterParams,
} from '../../../utils/filters/query-schema'

export const getUserPlaceMarkers = async (
  req: Request,
  res: Response<GetUserPlaceMarkersApiResponse>,
): Promise<void> => {
  const userId = req.auth.userId

  logger.info({
    msg: 'Get user place markers',
    event: 'get_user_place_markers',
    metadata: {
      userId,
      query: req.query,
    },
  })

  try {
    // Parse query parameters using shared schema
    const queryResult = UserPlacesQuerySchema.safeParse(req.query)
    if (!queryResult.success) {
      res.status(400).json({
        error: 'Invalid query parameters',
      })
      return
    }

    const query = queryResult.data
    const { listId, searchId } = query

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

    // Extract filter params using shared utility
    const filters = extractFilterParams(query)

    // Build filter conditions
    const filterConditions =
      Object.keys(filters).length > 0
        ? buildPlaceFilterConditions(filters)
        : sql`TRUE`

    // Determine query based on scope
    const isAllPlacesMode = !listId && !searchId

    let markersQuery: SQL<unknown>

    if (isAllPlacesMode) {
      // All places mode - query directly through user_place
      markersQuery = sql`
        SELECT DISTINCT ON (up.id)
          up.id,
          p.name,
          sts.status,
          p.location
        FROM "user_place" up
        JOIN "place" p ON p.id = up.place_id
        LEFT JOIN "status" sts ON sts.user_place_id = up.id
        LEFT JOIN "enrichment" e ON e.place_id = p.id AND up.enriched_at IS NOT NULL
        LEFT JOIN "enrichment_company" ec ON ec.enrichment_id = e.id
        WHERE up.user_id = ${userId}
          AND p.is_deleted = false
          AND p.location IS NOT NULL
          AND (${filterConditions})
        ORDER BY up.id, p.updated_at DESC
      `
    } else if (listId) {
      // List-scoped query
      markersQuery = sql`
        SELECT
          up.id,
          p.name,
          sts.status,
          p.location
        FROM "list" l
        JOIN "list_place" lp ON lp.list_id = l.id
        JOIN "user_place" up ON up.id = lp.user_place_id
        JOIN "place" p ON p.id = up.place_id
        LEFT JOIN "status" sts ON sts.user_place_id = up.id
        LEFT JOIN "enrichment" e ON e.place_id = p.id AND up.enriched_at IS NOT NULL
        LEFT JOIN "enrichment_company" ec ON ec.enrichment_id = e.id
        WHERE l.id = ${listId}
          AND l.user_id = ${userId}
          AND p.is_deleted = false
          AND p.location IS NOT NULL
          AND (${filterConditions})
        ORDER BY lp.created_at ASC
      `
    } else {
      // Search-scoped query
      markersQuery = sql`
        SELECT
          up.id,
          p.name,
          sts.status,
          p.location
        FROM "search" s
        JOIN "search_place" sp ON sp.search_id = s.id
        JOIN "user_place" up ON up.id = sp.user_place_id
        JOIN "place" p ON p.id = up.place_id
        LEFT JOIN "status" sts ON sts.user_place_id = up.id
        LEFT JOIN "enrichment" e ON e.place_id = p.id AND up.enriched_at IS NOT NULL
        LEFT JOIN "enrichment_company" ec ON ec.enrichment_id = e.id
        WHERE s.id = ${searchId}
          AND s.user_id = ${userId}
          AND p.is_deleted = false
          AND p.location IS NOT NULL
          AND (${filterConditions})
        ORDER BY sp.created_at ASC
      `
    }

    const result = (await db.execute(markersQuery)) as unknown as Array<{
      id: string
      name: string
      status: string | null
      location: { latitude: number; longitude: number }
    }>

    res.json({
      markers: result.map((row) => ({
        id: row.id,
        name: row.name ?? '',
        status: row.status ?? null,
        location: row.location ?? { latitude: 0, longitude: 0 },
      })),
      totalCount: result.length,
    })
  } catch (error) {
    logger.error({
      msg: 'Get user place markers error',
      event: 'get_user_place_markers_error',
      metadata: { error },
    })
    res.status(500).json({
      error: 'Failed to get user place markers',
    })
  }
}
