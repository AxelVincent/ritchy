import { createApiClient } from '@/lib/api/createApiClient'
import { useAuth } from '@clerk/clerk-react'
import type {
  DeleteItemsFromListApiResponse,
  DeleteItemsFromListRequest,
} from '@ritchy/types'
import { useMutation, useQueryClient } from '@tanstack/react-query'

const apiClient = createApiClient({
  baseUrl: import.meta.env.VITE_API_WEB_BASE_URL,
})

export const useDeleteItemsFromList = () => {
  const queryClient = useQueryClient()
  const { getToken } = useAuth()

  return useMutation({
    mutationFn: async ({
      id,
      items,
    }: DeleteItemsFromListRequest): Promise<DeleteItemsFromListApiResponse> => {
      const token = await getToken()
      const response =
        await apiClient.fetchWithAuth<DeleteItemsFromListApiResponse>(
          `/lists/${id}/items`,
          {
            method: 'DELETE',
            body: JSON.stringify({ items }),
          },
          token,
        )
      return response
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({
        queryKey: ['lists'],
        exact: true,
      })
      queryClient.invalidateQueries({
        queryKey: ['listContent', id],
        exact: true,
      })
    },
  })
}
