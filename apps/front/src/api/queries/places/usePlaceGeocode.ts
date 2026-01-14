import { useApiQuery } from '@/hooks/useApi'
import type { GeocodeApiResponse } from '@api/routes_web/places/geocode/contract'

const geocodeKeys = {
  all: ['geocode'] as const,
  place: (placeId: string) => [...geocodeKeys.all, 'place', placeId] as const,
}

export const usePlaceGeocode = (
  placeId: string,
  options?: { enabled?: boolean },
) => {
  return useApiQuery<GeocodeApiResponse>(
    `/places/${placeId}/geocode`,
    geocodeKeys.place(placeId),
    {
      staleTime: Number.POSITIVE_INFINITY,
      gcTime: 1000 * 60 * 60,
      enabled: options?.enabled && !!placeId,
    },
  )
}
