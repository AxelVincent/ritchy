import { useApiQuery } from '@/hooks/useApi'
import type { GetPlacesEnrichmentApiResponse } from '@ritchy/types'

const placeEnrichmentKeys = {
  all: ['placeEnrichment'] as const,
  place: (userPlaceId: string) =>
    [...placeEnrichmentKeys.all, userPlaceId] as const,
}
export const usePlaceEnrichmentQuery = (userPlaceId: string) => {
  return useApiQuery<GetPlacesEnrichmentApiResponse>(
    `/places/${userPlaceId}/enrichment`,
    placeEnrichmentKeys.place(userPlaceId),
  )
}
