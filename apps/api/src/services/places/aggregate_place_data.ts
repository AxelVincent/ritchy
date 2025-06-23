import { logger } from '@ritchy/logger'
import type { EnrichResponse, Place, PlaceBase } from '@ritchy/types'
import { EnrichResponseSchema } from '@ritchy/types'
import { z } from 'zod'
import { getUserEnrichedPlaces } from '../enrichment/getUserEnrichedPlaces'
import { getOrFetchEnrichmentData } from '../enrichment/get_or_fetch_enrichment_data'
import { getListAssociationsByPlaceIds } from '../lists/getListAssociationsByPlaceIds'
import { getNotesByPlaceIds } from './notes/getNotesByPlaceIds'
import { getStatusByPlaceIds } from './status/getStatusByPlaceIds'

interface AggregatePlaceDataOptions {
  userId: string
  listId?: string
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
  const { userId, excludeListId, includeEnrichment = false, listId } = options
  const placeIds = places.map((place) => place.id)

  // Create a map to store searchIds for each place
  const searchIdMap = new Map(
    places.filter((p) => p.searchId).map((p) => [p.id, p.searchId]),
  )
  const listIdMap = listId
    ? new Map(places.map((p) => [p.id, listId]))
    : new Map()

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

  // Aggregate data from different sources for each place
  const initialAggregatedPlaces = places.map(
    (basePlace): Place => ({
      ...basePlace,
      lists: associations.get(basePlace.id) || [],
      notes: notes.get(basePlace.id) || [],
      status: statuses.get(basePlace.id) || null,
      enrichment: null,
      searchId: searchIdMap.get(basePlace.id) || null,
      listId: listIdMap.get(basePlace.id) || null,
    }),
  )

  // Process enrichment data in parallel if needed
  if (includeEnrichment && enrichedPlaces.size > 0) {
    const enrichmentResults = await Promise.allSettled(
      places
        .filter((place) => enrichedPlaces.has(place.id))
        .map(async (place) => {
          const website = enrichedPlaces.get(place.id)
          if (!website) {
            return { placeId: place.id, enrichment: null }
          }
          const enrichmentData = await getOrFetchEnrichmentData(
            place.id,
            website,
          )
          if (!enrichmentData) return { placeId: place.id, enrichment: null }

          const sanitizedData = sanitizeEnrichmentData(enrichmentData, place.id)
          const validatedEnrichment = EnrichResponseSchema.parse(sanitizedData)
          return { placeId: place.id, enrichment: validatedEnrichment }
        }),
    )

    const enrichmentMap = new Map(
      enrichmentResults
        .filter(
          (
            result,
          ): result is PromiseFulfilledResult<{
            placeId: string
            enrichment: EnrichResponse | null
          }> =>
            result.status === 'fulfilled' && result.value.enrichment !== null,
        )
        .map((result) => [
          result.value.placeId,
          result.value.enrichment as EnrichResponse,
        ]),
    )

    return initialAggregatedPlaces.map((place) =>
      enrichmentMap.has(place.id)
        ? {
            ...place,
            enrichment: enrichmentMap.get(place.id) as EnrichResponse,
          }
        : place,
    )
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
    for (const platform of Object.keys(sanitized.socialLinks)) {
      const links = sanitized.socialLinks[platform]
      sanitized.socialLinks[platform] = Array.isArray(links)
        ? links.filter((link) => typeof link === 'string' && isValidUrl(link))
        : typeof links === 'string' && isValidUrl(links)
          ? [links]
          : []
    }
  }

  // Sanitize emails
  sanitized.emails = Array.isArray(sanitized.emails)
    ? sanitized.emails.filter(
        (email) =>
          typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
      )
    : []

  // Sanitize domain registration
  if (sanitized.domainRegistration) {
    const { registrationDate, registrar, domainAge } =
      sanitized.domainRegistration

    // Validate and fix registration date
    if (registrationDate && typeof registrationDate === 'string') {
      const date = new Date(registrationDate)
      sanitized.domainRegistration.registrationDate = !Number.isNaN(
        date.getTime(),
      )
        ? registrationDate
        : null
    }

    // Validate registrar
    sanitized.domainRegistration.registrar =
      typeof registrar === 'string' ? registrar : null

    // Validate domain age
    sanitized.domainRegistration.domainAge =
      typeof domainAge === 'number' ? domainAge : null

    // Recalculate domain age if needed
    if (
      sanitized.domainRegistration.registrationDate &&
      sanitized.domainRegistration.domainAge === null
    ) {
      try {
        const regDate = new Date(sanitized.domainRegistration.registrationDate)
        const now = new Date()
        sanitized.domainRegistration.domainAge = Math.floor(
          (now.getTime() - regDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25),
        )
      } catch {
        sanitized.domainRegistration.domainAge = null
      }
    }
  }

  // Ensure id is present
  sanitized.id = sanitized.id || placeId

  return sanitized
}

// Helper function
const isValidUrl = (url: string): boolean => {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}
