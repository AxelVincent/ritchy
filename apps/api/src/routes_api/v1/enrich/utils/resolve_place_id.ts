import { logger } from '@ritchy/logger'
import { eq } from 'drizzle-orm'
import { db } from '../../../../db/db'
import { place } from '../../../../db/schema'
import type { EnrichCompanyRequest } from '../../../../shared'
import { parseGoogleMapsUrl } from './parse_google_maps_url'
import { textSearchIdOnly } from './text_search_id_only'

export type ResolveResult = {
  placeId: string | null
  error?: string
}

/**
 * Resolve various input types to a Google Place ID
 *
 * Priority:
 * 1. Direct Place ID provided → validate and return
 * 2. Google Maps URL → parse and search
 */
export const resolveGooglePlaceId = async (
  input: EnrichCompanyRequest,
): Promise<ResolveResult> => {
  // Case 1: Direct Place ID provided
  if (input.googlePlaceId) {
    // Validate format (Place IDs start with "ChIJ")
    if (!input.googlePlaceId.startsWith('ChIJ')) {
      logger.warn({
        msg: 'Invalid Place ID format',
        event: 'invalid_place_id_format',
        metadata: { placeId: input.googlePlaceId },
      })
      return {
        placeId: null,
        error: 'Invalid Place ID format. Place IDs should start with "ChIJ"',
      }
    }

    // Check if we already have this place in DB (just for logging)
    const [existing] = await db
      .select({ source_id: place.source_id })
      .from(place)
      .where(eq(place.source_id, input.googlePlaceId))
      .limit(1)

    if (existing) {
      logger.info({
        msg: 'Place ID already exists in database',
        event: 'place_id_found_in_db',
        metadata: { placeId: input.googlePlaceId },
      })
    }

    return { placeId: input.googlePlaceId }
  }

  // Case 2: Google Maps URL provided
  if (input.googleMapsUrl) {
    const parsed = parseGoogleMapsUrl(input.googleMapsUrl)

    // Check for short URLs (not supported)
    if (parsed.isShortUrl) {
      return {
        placeId: null,
        error:
          'Short URLs (goo.gl/maps) are not supported. Please use the full Google Maps URL.',
      }
    }

    // If URL contained a place_id parameter, use it directly
    if (parsed.placeId) {
      return { placeId: parsed.placeId }
    }

    // Build search query from extracted data
    let textQuery = ''

    if (parsed.placeName) {
      textQuery = parsed.placeName
    }

    // If we have coordinates, add location bias
    const locationBias = parsed.coordinates
      ? {
          circle: {
            center: parsed.coordinates,
            radius: 500, // 500m radius for precision
          },
        }
      : undefined

    // If we have a place name, search for it
    if (textQuery) {
      const placeId = await textSearchIdOnly({
        textQuery,
        locationBias,
      })

      if (placeId) {
        return { placeId }
      }
    }

    // If we only have CID (legacy), we can't resolve it
    if (parsed.cid) {
      logger.warn({
        msg: 'CID-only URLs cannot be resolved',
        event: 'cid_only_url',
        metadata: { cid: parsed.cid, url: input.googleMapsUrl },
      })
      return {
        placeId: null,
        error:
          'This URL format (CID-based) is not supported. Please use a URL with the place name in the path.',
      }
    }

    return {
      placeId: null,
      error: 'Could not extract place information from the URL',
    }
  }

  return {
    placeId: null,
    error: 'No input provided',
  }
}
