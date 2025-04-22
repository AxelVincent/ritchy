import { logger } from '@ritchy/logger'
import type { EnrichResponse, Place, PlaceBase } from '@ritchy/types'
import { EnrichResponseSchema } from '@ritchy/types'
import { z } from 'zod'
import { getOrFetchEnrichmentData } from '../enrichment/getOrFetchEnrichmentData'
import { getUserEnrichedPlaces } from '../enrichment/getUserEnrichedPlaces'
import { getListAssociationsByPlaceIds } from '../lists/getListAssociationsByPlaceIds'
import { getNotesByPlaceIds } from '../places/notes/getNotesByPlaceIds'
import { getStatusByPlaceIds } from '../places/status/getStatusByPlaceIds'

interface AggregatePlaceDataOptions {
  userId: string
  excludeListId?: string
  includeEnrichment?: boolean
}
type PlaceWithSearchId = PlaceBase & { searchId?: string | null }

/**
 * Aggregates place data by joining information from different sources
 */
export const aggregatePlaceData = async (
  places: PlaceWithSearchId[],
  options: AggregatePlaceDataOptions,
): Promise<Place[]> => {
  const { userId, excludeListId, includeEnrichment = false } = options
  const placeIds = places.map((place) => place.id)

  // Create a map to store searchIds for each place
  const searchIdMap = new Map<string, string | null>()
  for (const place of places) {
    if (place.searchId) {
      searchIdMap.set(place.id, place.searchId)
    }
  }

  // Get associations, notes, and lead statuses for each place
  const associations = await getListAssociationsByPlaceIds(
    placeIds,
    userId,
    excludeListId,
  )
  const notes = await getNotesByPlaceIds(placeIds, userId)
  const statuses = await getStatusByPlaceIds(placeIds, userId)

  // Get user's enriched places if needed
  let enrichedPlaces = new Map<string, string>()
  if (includeEnrichment) {
    enrichedPlaces = await getUserEnrichedPlaces(userId)
    logger.info({
      msg: 'Fetched enriched places data',
      event: 'enriched_places_fetched',
      metadata: { count: enrichedPlaces.size },
    })
  }

  // Create a function to build a Place object from a PlaceBase
  const buildPlaceObject = (basePlace: PlaceBase): Place => {
    // Create a new object with all the required properties of Place
    const placeObject: Place = {
      ...basePlace,
      lists: associations.get(basePlace.id) || [],
      notes: notes.get(basePlace.id) || [],
      status: statuses.get(basePlace.id) || null,
      enrichment: null,
      searchId: searchIdMap.get(basePlace.id) || null,
    }
    return placeObject
  }

  // Aggregate data from different sources for each place
  const initialAggregatedPlaces = places.map(buildPlaceObject)

  // Process enrichment data in parallel if needed
  if (includeEnrichment) {
    // Collect all places that need enrichment
    const placesToEnrich = initialAggregatedPlaces.filter(
      (place) => enrichedPlaces.has(place.id) && enrichedPlaces.get(place.id),
    )

    if (placesToEnrich.length > 0) {
      // Create a map of place IDs to their websites
      const enrichmentRequests = placesToEnrich.map((place) => ({
        placeId: place.id,
        website: enrichedPlaces.get(place.id) as string,
      }))

      logger.info({
        msg: 'Processing enrichment data in parallel',
        event: 'enrichment_parallel_processing',
        metadata: { count: enrichmentRequests.length },
      })

      // Process all enrichment requests in parallel
      const enrichmentResults = await Promise.all(
        enrichmentRequests.map(async ({ placeId, website }) => {
          try {
            const enrichmentData = await getOrFetchEnrichmentData(
              placeId,
              website,
            )

            if (enrichmentData) {
              // Sanitize and validate the enrichment data
              const sanitizedData = sanitizeEnrichmentData(
                enrichmentData,
                placeId,
              )

              try {
                const validatedEnrichment =
                  EnrichResponseSchema.parse(sanitizedData)
                return { placeId, enrichment: validatedEnrichment }
              } catch (validationError) {
                logger.warn({
                  msg: 'Enrichment data validation failed',
                  event: 'enrichment_validation_failed',
                  metadata: {
                    placeId,
                    error: validationError,
                    enrichmentData: sanitizedData,
                  },
                })
              }
            }
          } catch (error) {
            logger.warn({
              msg: 'Failed to fetch or process enrichment data',
              event: 'enrichment_processing_failed',
              metadata: { placeId, error },
            })
          }

          return { placeId, enrichment: null }
        }),
      )

      // Create a map of place IDs to their enrichment data
      const enrichmentMap = new Map(
        enrichmentResults
          .filter((result) => result.enrichment !== null)
          .map((result) => [result.placeId, result.enrichment]),
      )

      // Merge enrichment data back into the aggregated places
      return initialAggregatedPlaces.map((place) => {
        if (enrichmentMap.has(place.id)) {
          // Create a new Place object with enrichment data
          const enrichedPlace: Place = {
            ...place,
            enrichment: enrichmentMap.get(place.id) || null,
          }
          return enrichedPlace
        }
        return place
      })
    }
  }

  return initialAggregatedPlaces
}

/**
 * Sanitizes enrichment data to ensure it meets validation requirements
 *
 * @param data - Raw enrichment data to sanitize
 * @param placeId - ID of the place (for logging)
 * @returns Sanitized enrichment data
 */
const sanitizeEnrichmentData = (
  data: EnrichResponse,
  placeId: string,
): EnrichResponse => {
  const sanitized = { ...data }

  // Sanitize social links
  if (sanitized.socialLinks) {
    for (const [platform, links] of Object.entries(sanitized.socialLinks)) {
      if (Array.isArray(links)) {
        // Filter out invalid URLs
        sanitized.socialLinks[platform] = links
          .filter((link) => typeof link === 'string')
          .filter((link) => {
            try {
              new URL(link)
              return true
            } catch {
              logger.debug({
                msg: 'Filtered out invalid URL from enrichment data',
                event: 'enrichment_invalid_url_filtered',
                metadata: { placeId, platform, invalidUrl: link },
              })
              return false
            }
          })
      } else if (links === null || links === undefined) {
        // Convert null/undefined to empty array
        sanitized.socialLinks[platform] = []
      } else if (typeof links === 'string') {
        // Convert single string to array if it's a valid URL
        try {
          new URL(links)
          sanitized.socialLinks[platform] = [links]
        } catch {
          sanitized.socialLinks[platform] = []
        }
      } else {
        // Default to empty array for any other type
        sanitized.socialLinks[platform] = []
      }
    }
  }

  // Sanitize emails
  if (sanitized.emails) {
    if (Array.isArray(sanitized.emails)) {
      // Keep only valid email strings
      sanitized.emails = sanitized.emails
        .filter((email: string) => typeof email === 'string')
        .filter((email: string) => {
          // Basic email validation
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          const isValid = emailRegex.test(email)
          if (!isValid) {
            logger.debug({
              msg: 'Filtered out invalid email from enrichment data',
              event: 'enrichment_invalid_email_filtered',
              metadata: { placeId, invalidEmail: email },
            })
          }
          return isValid
        })
    } else {
      // Default to empty array if not an array
      sanitized.emails = []
    }
  }

  // Ensure id is present
  if (!sanitized.id) {
    sanitized.id = placeId
  }

  return sanitized
}
