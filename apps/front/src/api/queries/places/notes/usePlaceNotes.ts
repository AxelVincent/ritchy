import { useApiQuery } from '@/hooks/useApi'
import type { NotesApiResponse } from '@ritchy/types'

const notesKeys = {
  all: ['notes'] as const,
  place: (placeId: string) => [...notesKeys.all, 'place', placeId] as const
}

export const usePlaceNotesQuery = (userPlaceId: string) => {
  return useApiQuery<NotesApiResponse>(
    `/places/${userPlaceId}/notes`,
    notesKeys.place(userPlaceId)
  )
}
