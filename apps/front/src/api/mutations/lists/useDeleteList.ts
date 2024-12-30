import { createApiClient } from '@/lib/api/createApiClient'
import { useAuth } from '@clerk/clerk-react'
import type {
  DeleteListApiResponse,
  DeleteListRequestParams,
} from '@ritchy/types'
import { useMutation, useQueryClient } from '@tanstack/react-query'

const apiClient = createApiClient({
  baseUrl: import.meta.env.VITE_API_WEB_BASE_URL,
})

export const useDeleteList = () => {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
    }: DeleteListRequestParams): Promise<DeleteListApiResponse> => {
      const token = await getToken()
      const response = await apiClient.fetchWithAuth(
        `/lists/${id}`,
        {
          method: 'DELETE',
        },
        token,
      )
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] })
    },
  })
}
