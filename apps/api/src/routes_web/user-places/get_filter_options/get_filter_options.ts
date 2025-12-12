import { logger } from '@ritchy/logger'
import {
  DEFAULT_PLACE_STATUS,
  type GetUserPlaceFilterOptionsApiResponse,
  NO_LISTS_LABEL,
} from '@ritchy/types'
import { and, eq, sql } from 'drizzle-orm'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { db } from '../../../db/db'
import { list, search } from '../../../db/schema'

// Query params schema for scope
const GetUserPlaceFilterOptionsQuerySchema = z.object({
  listId: z.string().uuid().optional(),
  searchId: z.string().uuid().optional(),
})

/**
 * Get distinct filter options for user places.
 * Returns unique values for multi-select filter columns.
 * Can be scoped to a specific list or search, or return all user places.
 */
export const getUserPlaceFilterOptions = async (
  req: Request,
  res: Response<GetUserPlaceFilterOptionsApiResponse>,
): Promise<void> => {
  const userId = req.auth.userId

  logger.info({
    msg: 'Get user place filter options',
    event: 'get_user_place_filter_options',
    metadata: { userId, query: req.query },
  })

  try {
    // Parse query parameters
    const queryResult = GetUserPlaceFilterOptionsQuerySchema.safeParse(
      req.query,
    )
    if (!queryResult.success) {
      res.status(400).json({
        error: 'Invalid query parameters',
      })
      return
    }

    const { listId, searchId } = queryResult.data

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

    // Determine query based on scope
    const isAllPlacesMode = !listId && !searchId

    // Build separate FROM and WHERE parts for proper SQL structure
    // JOINs must come before WHERE clause
    let baseFrom: ReturnType<typeof sql>
    let baseWhere: ReturnType<typeof sql>

    if (isAllPlacesMode) {
      // All places - query directly through user_place
      baseFrom = sql`FROM "user_place" up JOIN "place" p ON p.id = up.place_id`
      baseWhere = sql`WHERE up.user_id = ${userId} AND p.is_deleted = false`
    } else if (listId) {
      // List-scoped
      baseFrom = sql`FROM "list_place" lp JOIN "user_place" up ON up.id = lp.user_place_id JOIN "place" p ON p.id = up.place_id`
      baseWhere = sql`WHERE lp.list_id = ${listId} AND p.is_deleted = false`
    } else {
      // Search-scoped
      baseFrom = sql`FROM "search_place" sp JOIN "user_place" up ON up.id = sp.user_place_id JOIN "place" p ON p.id = up.place_id`
      baseWhere = sql`WHERE sp.search_id = ${searchId} AND p.is_deleted = false`
    }

    // Query distinct values for each filterable column
    // Structure: FROM ... [additional JOINs] ... WHERE ...
    const query = sql`
      SELECT
        -- Status options (from status table)
        (
          SELECT COALESCE(
            JSONB_AGG(DISTINCT sts.status ORDER BY sts.status)
            FILTER (WHERE sts.status IS NOT NULL),
            '[]'::jsonb
          )
          ${baseFrom}
          LEFT JOIN "status" sts ON sts.user_place_id = up.id
          ${baseWhere}
        ) as status_options,

        -- Primary type options
        (
          SELECT COALESCE(
            JSONB_AGG(DISTINCT p.primary_type ORDER BY p.primary_type)
            FILTER (WHERE p.primary_type IS NOT NULL AND p.primary_type != ''),
            '[]'::jsonb
          )
          ${baseFrom}
          ${baseWhere}
        ) as primary_type_options,

        -- Types options (unnest array column)
        (
          SELECT COALESCE(
            JSONB_AGG(DISTINCT t ORDER BY t)
            FILTER (WHERE t IS NOT NULL AND t != ''),
            '[]'::jsonb
          )
          ${baseFrom},
          LATERAL unnest(p.types) as t
          ${baseWhere}
        ) as types_options,

        -- Country options
        (
          SELECT COALESCE(
            JSONB_AGG(DISTINCT p.country ORDER BY p.country)
            FILTER (WHERE p.country IS NOT NULL AND p.country != ''),
            '[]'::jsonb
          )
          ${baseFrom}
          ${baseWhere}
        ) as country_options,

        -- Locality options
        (
          SELECT COALESCE(
            JSONB_AGG(DISTINCT p.locality ORDER BY p.locality)
            FILTER (WHERE p.locality IS NOT NULL AND p.locality != ''),
            '[]'::jsonb
          )
          ${baseFrom}
          ${baseWhere}
        ) as locality_options,

        -- Postal code options
        (
          SELECT COALESCE(
            JSONB_AGG(DISTINCT p.postal_code ORDER BY p.postal_code)
            FILTER (WHERE p.postal_code IS NOT NULL AND p.postal_code != ''),
            '[]'::jsonb
          )
          ${baseFrom}
          ${baseWhere}
        ) as postal_code_options,

        -- Source options (enum type - no empty string check)
        (
          SELECT COALESCE(
            JSONB_AGG(DISTINCT p.source ORDER BY p.source)
            FILTER (WHERE p.source IS NOT NULL),
            '[]'::jsonb
          )
          ${baseFrom}
          ${baseWhere}
        ) as source_options,

        -- Workforce range options (from enrichment_company)
        (
          SELECT COALESCE(
            JSONB_AGG(DISTINCT ec.workforce_range ORDER BY ec.workforce_range)
            FILTER (WHERE ec.workforce_range IS NOT NULL AND ec.workforce_range != ''),
            '[]'::jsonb
          )
          ${baseFrom}
          LEFT JOIN "enrichment" e ON e.place_id = p.id AND up.enriched_at IS NOT NULL
          LEFT JOIN "enrichment_company" ec ON ec.enrichment_id = e.id
          ${baseWhere}
        ) as workforce_range_options,

        -- Price level options (enum type - no empty string check)
        (
          SELECT COALESCE(
            JSONB_AGG(DISTINCT p.price_level ORDER BY p.price_level)
            FILTER (WHERE p.price_level IS NOT NULL),
            '[]'::jsonb
          )
          ${baseFrom}
          ${baseWhere}
        ) as price_level_options,

        -- Technologies options (from enrichment_technology)
        (
          SELECT COALESCE(
            JSONB_AGG(DISTINCT et.technology ORDER BY et.technology)
            FILTER (WHERE et.technology IS NOT NULL AND et.technology != ''),
            '[]'::jsonb
          )
          ${baseFrom}
          LEFT JOIN "enrichment" e ON e.place_id = p.id AND up.enriched_at IS NOT NULL
          LEFT JOIN "enrichment_technology" et ON et.enrichment_id = e.id
          ${baseWhere}
        ) as technologies_options,

        -- Associated lists options (formatted as "emoji name")
        (
          SELECT COALESCE(
            JSONB_AGG(DISTINCT (all_lists.emoji || ' ' || all_lists.name) ORDER BY (all_lists.emoji || ' ' || all_lists.name))
            FILTER (WHERE all_lists.id IS NOT NULL),
            '[]'::jsonb
          )
          ${baseFrom}
          JOIN "list_place" all_lp ON all_lp.user_place_id = up.id
          JOIN "list" all_lists ON all_lists.id = all_lp.list_id
          ${baseWhere}
        ) as lists_options
    `

    const result = (await db.execute(query)) as unknown as Array<{
      status_options: string[]
      primary_type_options: string[]
      types_options: string[]
      country_options: string[]
      locality_options: string[]
      postal_code_options: string[]
      source_options: string[]
      workforce_range_options: string[]
      price_level_options: string[]
      technologies_options: string[]
      lists_options: string[]
    }>

    const row = result[0]

    // Add default status to options if not present
    const statusOptions = row?.status_options ?? []
    if (!statusOptions.includes(DEFAULT_PLACE_STATUS)) {
      statusOptions.unshift(DEFAULT_PLACE_STATUS)
    }

    // Add 'No lists' option for places without any list associations
    const listsOptions = row?.lists_options ?? []
    if (!listsOptions.includes(NO_LISTS_LABEL)) {
      listsOptions.unshift(NO_LISTS_LABEL)
    }

    res.json({
      status: statusOptions,
      primaryType: row?.primary_type_options ?? [],
      types: row?.types_options ?? [],
      country: row?.country_options ?? [],
      locality: row?.locality_options ?? [],
      postalCode: row?.postal_code_options ?? [],
      source: row?.source_options ?? [],
      workforceRange: row?.workforce_range_options ?? [],
      priceLevel: row?.price_level_options ?? [],
      technologies: row?.technologies_options ?? [],
      lists: listsOptions,
    })
  } catch (error) {
    logger.error({
      msg: 'Get user place filter options error',
      event: 'get_user_place_filter_options_error',
      metadata: { error },
    })
    res.status(500).json({
      error: 'Failed to get filter options',
    })
  }
}
