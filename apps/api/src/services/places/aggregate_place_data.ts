import { logger } from '@ritchy/logger'
import type { EnrichResponse, Place, PlaceBase } from '@ritchy/types'
import { EnrichResponseSchema } from '@ritchy/types'
import type { PlaceDetailsOptimized } from '../../external/google_maps/place_details_optimized'
import { getEmailsByPlaceIds } from '../contact/queries/get_emails_by_place_id'
import { getPhonesByPlaceIds } from '../contact/queries/get_phones_by_place_ids'
import { getSocialMediasByPlaceIds } from '../contact/queries/get_social_medias_by_place_ids'
import {
  type EnrichmentLegacy,
  getUserEnrichedPlaces,
} from '../enrichment/getUserEnrichedPlaces'
import { getOrFetchEnrichmentData } from '../enrichment/get_or_fetch_enrichment_data'
import { getEnrichmentByPlaceIds } from '../enrichment/queries/get_enrichment_by_place_ids'
import { sanitizeEnrichmentData } from '../enrichment/utils/sanitize_enrichment_data'
import { getHubspotSyncedByPlaceIds } from '../hubspot/get_hubspot_synced_by_place_ids'
import { getListAssociationsByPlaceIds } from '../lists/getListAssociationsByPlaceIds'
import { getNotesByPlaceIds } from './notes/getNotesByPlaceIds'
import { getStatusByPlaceIds } from './status/getStatusByPlaceIds'

export interface AggregatePlaceDataOptions {
  userId: string
  excludeListId?: string
  includeEnrichment?: boolean
  listId?: string
}

/**
 * Aggregates place data by joining information from different sources
 */
export const aggregatePlaceData = async (
  places: PlaceDetailsOptimized[],
  options: AggregatePlaceDataOptions,
): Promise<Place[]> => {
  const { userId, excludeListId, includeEnrichment = false, listId } = options
  const userPlaceIds = places.map((place) => place.id)

  const listIdMap = listId
    ? new Map(places.map((p) => [p.id, listId]))
    : new Map()

  // Get associations, notes, and lead statuses for each place
  const associations = await getListAssociationsByPlaceIds(
    userPlaceIds,
    userId,
    excludeListId,
  )
  logger.debug({
    msg: 'List associations by place ids',
    event: 'list_associations_by_place_ids',
    metadata: {
      associationsCount: associations.size,
    },
  })
  const notes = await getNotesByPlaceIds(userPlaceIds)
  logger.debug({
    msg: 'Notes by place ids',
    event: 'notes_by_place_ids',
    metadata: {
      notesCount: notes.size,
    },
  })
  const statuses = await getStatusByPlaceIds(userPlaceIds)
  logger.debug({
    msg: 'Statuses by place ids',
    event: 'statuses_by_place_ids',
    metadata: {
      statusesCount: statuses.size,
    },
  })

  const emails = await getEmailsByPlaceIds(userPlaceIds)
  const phones = await getPhonesByPlaceIds(userPlaceIds)
  const instagramSocials = await getSocialMediasByPlaceIds(
    userPlaceIds,
    'INSTAGRAM',
  )
  const linkedinSocials = await getSocialMediasByPlaceIds(
    userPlaceIds,
    'LINKEDIN',
  )
  const facebookSocials = await getSocialMediasByPlaceIds(
    userPlaceIds,
    'FACEBOOK',
  )

  const hubspotSynced = await getHubspotSyncedByPlaceIds(userPlaceIds, userId)
  const enrichment = await getEnrichmentByPlaceIds(userPlaceIds)

  // Get user's enriched places if needed
  let enrichedPlaces = new Map<string, EnrichmentLegacy>()
  if (includeEnrichment) {
    enrichedPlaces = await getUserEnrichedPlaces(userPlaceIds)
    logger.debug({
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
      status: statuses.get(basePlace.id)?.status || 'NEW',
      domainRegisteredAt:
        enrichment.get(basePlace.id)?.domainRegisteredAt || null,
      description: enrichment.get(basePlace.id)?.description || null,
      shortDescription: enrichment.get(basePlace.id)?.shortDescription || null,
      listId: listIdMap.get(basePlace.id) || null,
      emails: emails.get(basePlace.id) || [],
      phones: phones.get(basePlace.id) || [],
      linkedinSocials: linkedinSocials.get(basePlace.id) || [],
      facebookSocials: facebookSocials.get(basePlace.id) || [],
      instagramSocials: instagramSocials.get(basePlace.id) || [],
      hubspotSynced: hubspotSynced.get(basePlace.id) || false,
      enrichedAt: enrichment.get(basePlace.id)?.enrichedAt || null,
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
            website.website,
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
