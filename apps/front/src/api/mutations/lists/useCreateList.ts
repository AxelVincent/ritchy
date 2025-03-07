import { createApiClient } from '@/lib/api/createApiClient'
import { useAuth } from '@clerk/clerk-react'
import type { CreateListRequest, CreateListResponse } from '@ritchy/types'
import { useMutation, useQueryClient } from '@tanstack/react-query'

const apiClient = createApiClient({
  baseUrl: import.meta.env.VITE_API_WEB_BASE_URL,
})

export const useCreateList = () => {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ name, emoji }: CreateListRequest) => {
      const token = await getToken()
      const response = await apiClient.fetchWithAuth<CreateListResponse>(
        '/lists',
        {
          method: 'POST',
          body: JSON.stringify({ name, emoji }),
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
