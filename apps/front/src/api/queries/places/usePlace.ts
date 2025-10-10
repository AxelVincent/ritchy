import { useApiQuery } from '@/hooks/useApi'
import type { GetPlaceApiResponse } from '@ritchy/types'

export const placeKeys = {
  all: ['place'] as const,
  place: (userPlaceId: string) => [...placeKeys.all, userPlaceId] as const,
}

export const usePlaceQuery = (userPlaceId: string, enabled = true) => {
  return useApiQuery<GetPlaceApiResponse>(
    `/places/${userPlaceId}`,
    placeKeys.place(userPlaceId),
    { enabled },
  )
}
