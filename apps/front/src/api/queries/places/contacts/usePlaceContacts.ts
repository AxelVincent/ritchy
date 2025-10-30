import { useApiQuery } from '@/hooks/useApi'
import type { GetPlacesContactsApiResponse } from '@ritchy/types/src/api/places/contacts/get'

export const placeContactsKeys = {
  all: ['placeContacts'] as const,
  place: (userPlaceId: string) =>
    [...placeContactsKeys.all, userPlaceId] as const,
}

export const usePlaceContactsQuery = (userPlaceId: string) => {
  return useApiQuery<GetPlacesContactsApiResponse>(
    `/places/${userPlaceId}/contacts`,
    placeContactsKeys.place(userPlaceId),
  )
}
