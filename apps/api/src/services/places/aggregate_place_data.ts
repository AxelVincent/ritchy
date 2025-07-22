import { logger } from '@ritchy/logger'
import type { EnrichResponse, Place, PlaceBase } from '@ritchy/types'
import { EnrichResponseSchema } from '@ritchy/types'
import { getUserEnrichedPlaces } from '../enrichment/getUserEnrichedPlaces'
import { getOrFetchEnrichmentData } from '../enrichment/get_or_fetch_enrichment_data'
import { sanitizeEnrichmentData } from '../enrichment/utils/sanitize_enrichment_data'
import { getHubspotSyncedByPlaceIds } from '../hubspot/get_hubspot_synced_by_place_ids'
import { getListAssociationsByPlaceIds } from '../lists/getListAssociationsByPlaceIds'
import { getPrimaryEmailsByPlaceIds } from './contacts/queries/get_primary_emails_by_place_id'
import { getPrimarySocialsByPlaceIds } from './contacts/queries/get_primary_socials_by_place_id'
import { getSecondaryEmailsByPlaceIds } from './contacts/queries/get_secondary_emails_by_place_id'
import { groupSecondarySocialsByPlace } from './group_secondary_socials_by_place'
import { getNotesByPlaceIds } from './notes/getNotesByPlaceIds'
import { getStatusByPlaceIds } from './status/getStatusByPlaceIds'
import type { PlaceDetailsOptimized } from '../../external/google_maps/place_details_optimized'

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
  options: AggregatePlaceDataOptions
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
    excludeListId
  )
  logger.info({
    msg: 'List associations by place ids',
    event: 'list_associations_by_place_ids',
    metadata: {
      associations
    }
  })
  const notes = await getNotesByPlaceIds(userPlaceIds)
  logger.info({
    msg: 'Notes by place ids',
    event: 'notes_by_place_ids',
    metadata: {
      notes
    }
  })
  const statuses = await getStatusByPlaceIds(userPlaceIds)
  logger.info({
    msg: 'Statuses by place ids',
    event: 'statuses_by_place_ids',
    metadata: {
      statuses
    }
  })
  const primaryEmails = await getPrimaryEmailsByPlaceIds(userPlaceIds)
  logger.info({
    msg: 'Primary emails by place ids',
    event: 'primary_emails_by_place_ids',
    metadata: {
      primaryEmails
    }
  })
  const secondaryEmails = await getSecondaryEmailsByPlaceIds(userPlaceIds)
  logger.info({
    msg: 'Secondary emails by place ids',
    event: 'secondary_emails_by_place_ids',
    metadata: {
      secondaryEmails
    }
  })
  const secondarySocials = await groupSecondarySocialsByPlace(userPlaceIds)
  logger.info({
    msg: 'Secondary socials by place ids',
    event: 'secondary_socials_by_place_ids',
    metadata: {
      secondarySocials
    }
  })
  const hubspotSynced = await getHubspotSyncedByPlaceIds(userPlaceIds, userId)
  logger.info({
    msg: 'Hubspot synced by place ids',
    event: 'hubspot_synced_by_place_ids',
    metadata: {
      hubspotSynced
    }
  })

  // Get all primary socials for all platforms in a single query
  const primarySocialsByPlace = await getPrimarySocialsByPlaceIds(userPlaceIds)

  // Get user's enriched places if needed
  let enrichedPlaces = new Map<string, string>()
  if (includeEnrichment) {
    enrichedPlaces = await getUserEnrichedPlaces(userPlaceIds)
    logger.info({
      msg: 'Fetched enriched places data',
      event: 'enriched_places_fetched',
      metadata: { count: enrichedPlaces.size }
    })
  }

  // Aggregate data from different sources for each place
  const initialAggregatedPlaces = places.map((basePlace): Place => {
    // get primary and secondary socials for the place
    const primaryPlaceSocials =
      primarySocialsByPlace.get(basePlace.id) || new Map()
    const secondaryPlaceSocials =
      secondarySocials.get(basePlace.id) || new Map()

    return {
      ...basePlace,
      lists: associations.get(basePlace.id) || [],
      notes: notes.get(basePlace.id) || [],
      status: statuses.get(basePlace.id)?.status || 'NEW',
      enrichment: null,
      listId: listIdMap.get(basePlace.id) || null,
      primaryEmail: primaryEmails.get(basePlace.id) || null,
      secondaryEmails: secondaryEmails.get(basePlace.id) || [],
      primaryLinkedinSocial: primaryPlaceSocials.get('linkedin') || null,
      primaryFacebookSocial: primaryPlaceSocials.get('facebook') || null,
      primaryInstagramSocial: primaryPlaceSocials.get('instagram') || null,
      primaryTwitterSocial: primaryPlaceSocials.get('twitter') || null,
      secondaryLinkedinSocials: secondaryPlaceSocials.get('linkedin') || [],
      secondaryFacebookSocials: secondaryPlaceSocials.get('facebook') || [],
      secondaryInstagramSocials: secondaryPlaceSocials.get('instagram') || [],
      secondaryTwitterSocials: secondaryPlaceSocials.get('twitter') || [],
      hubspotSynced: hubspotSynced.get(basePlace.id) || false
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
            website
          )
          if (!enrichmentData) return { placeId: place.id, enrichment: null }

          const sanitizedData = sanitizeEnrichmentData(enrichmentData, place.id)
          const validatedEnrichment = EnrichResponseSchema.parse(sanitizedData)
          return { placeId: place.id, enrichment: validatedEnrichment }
        })
    )

    const enrichmentMap = new Map(
      enrichmentResults
        .filter(
          (
            result
          ): result is PromiseFulfilledResult<{
            placeId: string
            enrichment: EnrichResponse | null
          }> =>
            result.status === 'fulfilled' && result.value.enrichment !== null
        )
        .map((result) => [
          result.value.placeId,
          result.value.enrichment as EnrichResponse
        ])
    )

    return initialAggregatedPlaces.map((place) =>
      enrichmentMap.has(place.id)
        ? {
            ...place,
            enrichment: enrichmentMap.get(place.id) as EnrichResponse
          }
        : place
    )
  }

  return initialAggregatedPlaces
}
