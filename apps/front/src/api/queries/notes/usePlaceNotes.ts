import { createApiClient } from '@/lib/api/createApiClient'
import { useAuth } from '@clerk/clerk-react'
import type { NotesApiResponse } from '@ritchy/types'
import { type UseQueryResult, useQuery } from '@tanstack/react-query'

const apiClient = createApiClient({
  baseUrl: import.meta.env.VITE_API_WEB_BASE_URL,
})

export const usePlaceNotesQuery = (
  placeId: string,
): UseQueryResult<NotesApiResponse> => {
  const { getToken } = useAuth()

  return useQuery({
    queryKey: ['placeNotes', placeId],
    queryFn: async () => {
      const token = await getToken()

      const response = await apiClient.fetchWithAuth(
        `/notes/${placeId}`,
        {
          method: 'GET',
        },
        token,
      )
      return response
    },
  })
}
