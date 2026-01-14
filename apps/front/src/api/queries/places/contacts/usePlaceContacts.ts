import { useApiQuery } from '@/hooks/useApi'
import type { GetContactsApiResponse } from '@api/routes_web/places/contacts/contract'

export const placeContactsKeys = {
  all: ['placeContacts'] as const,
  place: (userPlaceId: string) =>
    [...placeContactsKeys.all, userPlaceId] as const,
}

export const usePlaceContactsQuery = (userPlaceId: string) => {
  return useApiQuery<GetContactsApiResponse>(
    `/places/${userPlaceId}/contacts`,
    placeContactsKeys.place(userPlaceId),
  )
}
