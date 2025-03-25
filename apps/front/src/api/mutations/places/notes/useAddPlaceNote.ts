import { useApiMutation } from '@/hooks/useApi'
import type { AddNoteApiResponse, AddNoteRequest } from '@ritchy/types'
import { useQueryClient } from '@tanstack/react-query'

export const useAddPlaceNote = () => {
  const queryClient = useQueryClient()

  return useApiMutation<AddNoteApiResponse, AddNoteRequest>(
    '/places/:placeId/notes',
    {
      getEndpoint: ({ placeId }) => `/places/${placeId}/notes`,
      getBody: ({ note }) => ({ note }),
      onSuccess: (_, { placeId }) => {
        // Invalidate the notes query for this place
        queryClient.invalidateQueries({
          queryKey: ['notes', 'place', placeId],
          exact: true,
        })
      },
    },
  )
}
