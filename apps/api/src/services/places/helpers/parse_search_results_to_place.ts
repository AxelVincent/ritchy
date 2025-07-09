import { logger } from '@ritchy/logger'
import type { PlaceBase } from '@ritchy/types'
import { calculateOpenNow } from '../../../external/google_maps/utils/calculateOpenNow'
import { mapToPlaceDetails } from '../../../external/google_maps/utils/mapper'

type CacheData<T> = {
  data: T
  is_deleted?: boolean
  created_at: string
  updated_at: string
  expires_at?: string
}

type RedisSearchResults = (string | number | string[])[]

/**
 * Parse raw FT.SEARCH results to PlaceBase[]
 * @param rawResults - Raw FT.SEARCH results
 * @returns Array of PlaceBase objects
 */
export const parseSearchResultsToPlaces = (
  rawResults: RedisSearchResults,
): PlaceBase[] => {
  const places: PlaceBase[] = []

  if (rawResults.length <= 1) {
    return places
  }

  const count = rawResults[0] as number

  // FT.SEARCH returns: [count, key1, fields1, key2, fields2, ...]
  for (let i = 1; i < rawResults.length; i += 2) {
    const key = String(rawResults[i])
    const fields = rawResults[i + 1] as string[]

    logger.debug({
      msg: 'Processing search result',
      event: 'places_search_parse_debug',
      metadata: { key, fieldsLength: fields.length },
    })

    // Look for the '$' field (Redis JSON root path)
    const rootIndex = fields.indexOf('$')
    if (rootIndex !== -1 && rootIndex + 1 < fields.length) {
      try {
        const jsonData = fields[rootIndex + 1]
        const cachedData = JSON.parse(jsonData) as CacheData<PlaceBase>

        // Extract the actual place data from the cached structure
        const place = mapToPlaceDetails(cachedData.data)

        // Recalculate openNow for cached places
        if (place.openingHours) {
          place.openingHours.openNow = calculateOpenNow(
            place.openingHours,
            place.utcOffsetMinutes,
          )
        }

        places.push(place)
      } catch (error) {
        logger.error({
          msg: 'Failed to parse place data in search results',
          event: 'places_search_parse_error',
          metadata: {
            key,
            error,
            jsonData: `${fields[rootIndex + 1]?.substring(0, 100)}...`,
          },
        })
      }
    } else {
      logger.warn({
        msg: 'No root field ($) found in search result',
        event: 'places_search_no_root_field',
        metadata: {
          key,
          fields,
          availableFields: fields.filter((_, i) => i % 2 === 0),
        },
      })
    }
  }

  logger.info({
    msg: 'Search results parsing completed',
    event: 'places_search_parse_complete',
    metadata: {
      totalResults: count,
      parsedPlaces: places.length,
      parseSuccessRate: `${((places.length / count) * 100).toFixed(1)}%`,
    },
  })

  return places
}
