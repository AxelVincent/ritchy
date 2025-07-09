import { logger } from '@ritchy/logger'
import type {
  FilterCondition,
  PostGetPlacesApiResponse,
  PostGetPlacesRequest
} from '@ritchy/types'
import { and, eq } from 'drizzle-orm'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { db } from '../../db/db'
import {
  contact,
  contactEmail,
  contactSocial,
  list,
  listPlace,
  note,
  search,
  status
} from '../../db/schema'
import { postTextSearchV1 } from '../../external/google_maps/text_search_V1'
import { REDIS_KEYS } from '../../external/redis/keys'
import { redisClient } from '../../external/redis/redis'
import { getAggregatedPlaces } from '../../services/places/get_aggregated_places'
import { parseDrizzleFilter } from '../../services/places/helpers/parse_drizzle_filter'
import { separateFilters } from '../../services/places/helpers/separate_filters'
import { ensurePlacesIndex } from '../../services/places/helpers/ensure_places_index'

export const postGetPlaces = async (
  req: Request<
    Record<string, never>,
    PostGetPlacesApiResponse,
    PostGetPlacesRequest,
    Record<string, never>
  >,
  res: Response<PostGetPlacesApiResponse>
): Promise<void> => {
  try {
    const { filters, listId, searchId } = req.body
    const userId = req.auth.userId

    // Separate PostgreSQL and Redis filters
    const { pgFilters, redisFilters } = separateFilters(filters)

    // Build where conditions
    const whereConditions = listId
      ? and(
          eq(list.userId, userId),
          eq(list.id, listId), // Add list ID filter when provided
          pgFilters ? parseDrizzleFilter(pgFilters) : undefined
        )
      : and(
          eq(list.userId, userId),
          pgFilters ? parseDrizzleFilter(pgFilters) : undefined
        )

    // Base query joining all relevant tables
    const query = db
      .select({
        placeId: listPlace.placeId,
        searchId: listPlace.searchId
      })
      .from(listPlace)
      .leftJoin(list, eq(listPlace.listId, list.id))
      .leftJoin(
        status,
        and(eq(status.placeId, listPlace.placeId), eq(status.userId, userId))
      )
      .leftJoin(
        note,
        and(eq(note.placeId, listPlace.placeId), eq(note.userId, userId))
      )
      .leftJoin(
        contact,
        and(eq(contact.placeId, listPlace.placeId), eq(contact.userId, userId))
      )
      .leftJoin(contactEmail, eq(contactEmail.contactId, contact.id))
      .leftJoin(contactSocial, eq(contactSocial.contactId, contact.id))
      .where(whereConditions)

    const results = await query

    // Deduplicate places using Set
    const uniquePlaceIds = [...new Set(results.map((r) => r.placeId))]
    const filteredPlaces = uniquePlaceIds.map((placeId) => {
      const match = results.find((r) => r.placeId === placeId)
      return {
        placeId,
        searchId: match ? match.searchId : null
      }
    })

    logger.info({
      msg: 'Get places completed',
      event: 'get_places_success',
      metadata: {
        originalPlaces: results.length,
        places: filteredPlaces,
        uniquePlaces: filteredPlaces.length,
        hasPgFilters: !!pgFilters,
        hasListId: !!listId
      }
    })

    if (searchId) {
      await handleSearchPlaces(
        filteredPlaces,
        searchId,
        userId,
        redisFilters || undefined,
        res
      )
    } else {
      await handleListPlaces(
        filteredPlaces,
        '',
        userId,
        redisFilters || undefined,
        res
      )
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.info({
        msg: 'Validation error',
        event: 'validation_error',
        metadata: { error }
      })
      res.status(400).json({
        error: 'Invalid request data',
        message: 'Invalid request data',
        details: error.errors
      })
      return
    }

    logger.error({
      msg: 'Get places error',
      event: 'get_places_error',
      metadata: { error }
    })
    res.status(500).json({
      error: 'Failed to get places',
      message: 'Failed to get places'
    })
  }
}

const handleListPlaces = async (
  filteredPlaces: { placeId: string; searchId: string | null }[],
  listId: string,
  userId: string,
  redisFilters: FilterCondition | undefined,
  res: Response<PostGetPlacesApiResponse>
): Promise<void> => {
  const { places: aggregatedPlaceDetails } = await getAggregatedPlaces(
    filteredPlaces,
    {
      userId,
      excludeListId: listId,
      includeEnrichment: true,
      listId,
      redisFilters
    }
  )

  res.json({ places: aggregatedPlaceDetails })
}

const handleSearchPlaces = async (
  filteredPlaces: { placeId: string; searchId: string | null }[],
  searchId: string,
  userId: string,
  redisFilters: FilterCondition | undefined,
  res: Response<PostGetPlacesApiResponse>
): Promise<void> => {
  // Verify search ownership
  const [result] = await db
    .select()
    .from(search)
    .where(and(eq(search.id, searchId), eq(search.userId, userId)))

  if (!result) {
    res.status(404).json({
      error: 'Search not found'
    })
    return
  }

  // Validate search cache
  const key = REDIS_KEYS.search(searchId)
  let cachedResults = await redisClient.get<string[]>(key)

  if (!cachedResults?.data?.length) {
    logger.info({
      msg: 'No cached search results, fetching from Google Maps and caching',
      event: 'no_cached_search_results',
      metadata: {
        searchId,
        userId,
        model: result.model,
        keyword: result.keyword
      }
    })

    const freshResults = await postTextSearchV1({
      model: result.model,
      textQuery: result.keyword,
      rectangle: result.rectangle
    })

    const placeIds = freshResults.map((place) => place.id)
    await redisClient.set(key, placeIds)
    cachedResults = {
      data: placeIds,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }

  if (!cachedResults?.data) {
    res.status(500).json({ error: 'Failed to get search content' })
    return
  }

  // Filter places based on cache validation
  const validPlaces = filteredPlaces.filter((place) =>
    cachedResults?.data.includes(place.placeId)
  )

  const { places: aggregatedResults } = await getAggregatedPlaces(validPlaces, {
    userId,
    includeEnrichment: true,
    redisFilters
  })

  res.json({ places: aggregatedResults })
}
