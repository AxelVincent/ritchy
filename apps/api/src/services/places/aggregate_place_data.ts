import { logger } from '@ritchy/logger'
import type { EnrichResponse, Place, PlaceBase } from '@ritchy/types'
import { EnrichResponseSchema } from '@ritchy/types'
import { getUserEnrichedPlaces } from '../enrichment/getUserEnrichedPlaces'
import { getOrFetchEnrichmentData } from '../enrichment/get_or_fetch_enrichment_data'
import { sanitizeEnrichmentData } from '../enrichment/utils/sanitize_enrichment_data'
import { getHubspotSyncedByPlaceIds } from '../hubspot/get_hubspot_synced_by_place_ids'
import { getListAssociationsByPlaceIds } from '../lists/getListAssociationsByPlaceIds'
import { getPrimaryEmailsByPlaceIds } from './contacts/queries/get_primary_emails_by_place_id'
import { getSecondaryEmailsByPlaceIds } from './contacts/queries/get_secondary_emails_by_place_id'
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
  const primaryEmails = await getPrimaryEmailsByPlaceIds(placeIds, userId)
  const secondaryEmails = await getSecondaryEmailsByPlaceIds(placeIds, userId)
  const hubspotSynced = await getHubspotSyncedByPlaceIds(placeIds, userId)
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
  const initialAggregatedPlaces = places.map((basePlace): Place => {
    return {
      ...basePlace,
      lists: associations.get(basePlace.id) || [],
      notes: notes.get(basePlace.id) || [],
      status: statuses.get(basePlace.id) || null,
      enrichment: null,
      searchId: searchIdMap.get(basePlace.id) || null,
      listId: listIdMap.get(basePlace.id) || null,
      primaryEmail: primaryEmails.get(basePlace.id) || null,
      secondaryEmails: secondaryEmails.get(basePlace.id) || [],
      hubspotSynced: hubspotSynced.get(basePlace.id) || false,
    }
  })

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
