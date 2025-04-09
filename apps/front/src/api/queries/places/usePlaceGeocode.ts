import { useApiQuery } from '@/hooks/useApi'
import type { GeocodeApiResponse } from '@ritchy/types'

const geocodeKeys = {
  all: ['geocode'] as const,
  place: (placeId: string) => [...geocodeKeys.all, 'place', placeId] as const,
}

export const usePlaceGeocode = (placeId: string) => {
  return useApiQuery<GeocodeApiResponse>(
    `/places/${placeId}/geocode`,
    geocodeKeys.place(placeId),
    {
      staleTime: Number.POSITIVE_INFINITY,
      gcTime: 1000 * 60 * 60,
    },
  )
}
