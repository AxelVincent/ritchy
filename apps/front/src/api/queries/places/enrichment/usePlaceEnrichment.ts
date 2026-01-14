import { useApiQuery } from '@/hooks/useApi'
import type { GetEnrichmentApiResponse } from '@api/routes_web/places/enrichment/contract'

export const placeEnrichmentKeys = {
  all: ['placeEnrichment'] as const,
  place: (userPlaceId: string) =>
    [...placeEnrichmentKeys.all, userPlaceId] as const,
}
export const usePlaceEnrichmentQuery = (userPlaceId: string) => {
  return useApiQuery<GetEnrichmentApiResponse>(
    `/places/${userPlaceId}/enrichment`,
    placeEnrichmentKeys.place(userPlaceId),
  )
}
