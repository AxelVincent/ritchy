import { createApiClient } from '@/lib/api/createApiClient'
import { useAuth } from '@clerk/clerk-react'
import type { AddNoteApiResponse, AddNoteRequest } from '@ritchy/types'
import { useMutation, useQueryClient } from '@tanstack/react-query'

const apiClient = createApiClient({
  baseUrl: import.meta.env.VITE_API_WEB_BASE_URL,
})

export const useAddPlaceNote = () => {
  const queryClient = useQueryClient()
  const { getToken } = useAuth()

  return useMutation({
    mutationFn: async ({
      placeId,
      note,
    }: AddNoteRequest): Promise<AddNoteApiResponse> => {
      const token = await getToken()
      const response = await apiClient.fetchWithAuth(
        `/notes/${placeId}`,
        {
          method: 'POST',
          body: JSON.stringify({ note }),
        },
        token,
      )
      return response
    },
    onSuccess: (_, { placeId }) => {
      // Invalidate the notes query for this place
      queryClient.invalidateQueries({
        queryKey: ['placeNotes', placeId],
        exact: true,
      })
    },
  })
}
