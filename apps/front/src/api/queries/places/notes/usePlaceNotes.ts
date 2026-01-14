import { useApiQuery } from '@/hooks/useApi'
import type { ListNotesApiResponse } from '@api/routes_web/places/notes/list-notes/contract'

const notesKeys = {
  all: ['notes'] as const,
  place: (placeId: string) => [...notesKeys.all, 'place', placeId] as const,
}

export const usePlaceNotesQuery = (userPlaceId: string) => {
  return useApiQuery<ListNotesApiResponse>(
    `/places/${userPlaceId}/notes`,
    notesKeys.place(userPlaceId),
  )
}
