import { createApiClient } from '@/lib/api/createApiClient'
import { useAuth } from '@clerk/clerk-react'
import type {
  AddItemsToListApiResponse,
  AddItemsToListRequest,
} from '@ritchy/types'
import { useMutation, useQueryClient } from '@tanstack/react-query'

const apiClient = createApiClient({
  baseUrl: import.meta.env.VITE_API_WEB_BASE_URL,
})

export const useAddItemsToList = () => {
  const queryClient = useQueryClient()
  const { getToken } = useAuth()

  return useMutation({
    mutationFn: async ({
      id,
      items,
    }: AddItemsToListRequest): Promise<AddItemsToListApiResponse> => {
      const token = await getToken()
      const response = await apiClient.fetchWithAuth(
        `/lists/${id}`,
        {
          method: 'POST',
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
