import { createApiClient } from '@/lib/api/createApiClient'
import { useAuth } from '@clerk/clerk-react'
import type {
  CreateSearchApiResponse,
  CreateSearchRequestBody,
} from '@ritchy/types'
import { useMutation, useQueryClient } from '@tanstack/react-query'

const apiClient = createApiClient({
  baseUrl: import.meta.env.VITE_API_WEB_BASE_URL,
})

export const useCreateSearch = () => {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (
      searchParams: CreateSearchRequestBody,
    ): Promise<CreateSearchApiResponse> => {
      const token = await getToken()
      const response = await apiClient.fetchWithAuth(
        '/search',
        {
          method: 'POST',
          body: JSON.stringify(searchParams),
        },
        token,
      )
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['searches'],
        exact: true,
      })
    },
  })
}
