import { createApiClient } from '@/lib/api/createApiClient'
import { useAuth } from '@clerk/clerk-react'
import type {
  CreateCheckoutSessionApiResponse,
  CreateCheckoutSessionRequestBody,
} from '@ritchy/types'
import { type UseMutationResult, useMutation } from '@tanstack/react-query'

const apiClient = createApiClient({
  baseUrl: import.meta.env.VITE_API_WEB_BASE_URL,
})

export const useCreateCheckoutSession = (): UseMutationResult<
  CreateCheckoutSessionApiResponse,
  Error,
  CreateCheckoutSessionRequestBody
> => {
  const { getToken } = useAuth()

  return useMutation({
    mutationFn: async (body: CreateCheckoutSessionRequestBody) => {
      const token = await getToken()
      const response = await apiClient.fetchWithAuth(
        '/payments/create-checkout-session',
        {
          method: 'POST',
          body: JSON.stringify(body),
        },
        token,
      )
      return response
    },
  })
}
