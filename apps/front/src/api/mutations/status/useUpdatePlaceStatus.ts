import { createApiClient } from '@/lib/api/createApiClient'
import { useAuth } from '@clerk/clerk-react'
import type {
  UpdateStatusApiResponse,
  UpdateStatusRequest,
} from '@ritchy/types'
import { useMutation, useQueryClient } from '@tanstack/react-query'

const apiClient = createApiClient({
  baseUrl: import.meta.env.VITE_API_WEB_BASE_URL,
})

export const useUpdatePlaceStatus = () => {
  const queryClient = useQueryClient()
  const { getToken } = useAuth()

  return useMutation({
    mutationFn: async ({
      placeId,
      status,
    }: UpdateStatusRequest): Promise<UpdateStatusApiResponse> => {
      const token = await getToken()
      const response = await apiClient.fetchWithAuth<UpdateStatusApiResponse>(
        `/status/${placeId}`,
        {
          method: 'PUT',
          body: JSON.stringify({ status }),
        },
        token,
      )
      return response
    },
    onSuccess: (_, { placeId }) => {
      // Invalidate queries that might contain this place
      queryClient.invalidateQueries({
        queryKey: ['place', placeId],
      })

      // Invalidate any list queries that might contain this place
      queryClient.invalidateQueries({
        queryKey: ['places'],
      })
    },
  })
}
