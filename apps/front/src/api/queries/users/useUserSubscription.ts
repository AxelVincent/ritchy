import { createApiClient } from '@/lib/api/createApiClient'
import { useAuth } from '@clerk/clerk-react'
import type { UserSubscriptionApiResponse } from '@ritchy/types'
import { type UseQueryResult, useQuery } from '@tanstack/react-query'

const apiClient = createApiClient({
  baseUrl: import.meta.env.VITE_API_WEB_BASE_URL,
})

export const useUserSubscription = (): UseQueryResult<
  Extract<UserSubscriptionApiResponse, { plan: string }>,
  Error
> => {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: ['userSubscription'],
    queryFn: async () => {
      const token = await getToken()
      const response = await apiClient.fetchWithAuth(
        '/users/subscription',
        {
          method: 'GET',
        },
        token,
      )

      if ('error' in response) {
        throw new Error(response.message ?? response.error)
      }

      return response
    },
  })
}
