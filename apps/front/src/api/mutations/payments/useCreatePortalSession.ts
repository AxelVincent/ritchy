import { createApiClient } from '@/lib/api/createApiClient'
import { useAuth } from '@clerk/clerk-react'
import type { CreatePortalSessionApiResponse } from '@ritchy/types'
import { type UseMutationResult, useMutation } from '@tanstack/react-query'

const apiClient = createApiClient({
  baseUrl: import.meta.env.VITE_API_WEB_BASE_URL,
})

export const useCreatePortalSession = (): UseMutationResult<
  string,
  Error,
  void
> => {
  const { getToken } = useAuth()

  return useMutation({
    mutationFn: async () => {
      const token = await getToken()
      const response =
        await apiClient.fetchWithAuth<CreatePortalSessionApiResponse>(
          '/payments/create-portal-session',
          {
            method: 'POST',
          },
          token,
        )

      if ('error' in response) {
        throw new Error(response.message || 'Failed to create portal session')
      }

      return response.url
    },
  })
}
