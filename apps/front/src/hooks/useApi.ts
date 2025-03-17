import { useAuth } from '@clerk/clerk-react'
import type { ApiErrorResponse } from '@ritchy/types'
import {
  type UseMutationOptions,
  type UseQueryOptions,
  useMutation,
  useQuery,
} from '@tanstack/react-query'
import { createApiClient } from '../lib/api/createApiClient'

// Create a single API client instance per base URL
export const webApiClient = createApiClient({
  baseUrl: import.meta.env.VITE_API_WEB_BASE_URL || '/api/web',
})

export function useApiQuery<TData, TError = ApiErrorResponse>(
  endpoint: string,
  queryKey: readonly unknown[],
  options?: Omit<
    UseQueryOptions<TData, TError, TData>,
    'queryKey' | 'queryFn'
  > & {
    requireAuth?: boolean
  },
) {
  const { getToken } = useAuth()
  const { requireAuth = true, ...queryOptions } = options || {}

  return useQuery<TData, TError>({
    queryKey,
    queryFn: async ({ signal }) => {
      try {
        const token = requireAuth ? await getToken() : null
        return await webApiClient.fetchWithAuth<TData>(
          endpoint,
          {
            signal,
            method: 'GET',
          },
          token,
        )
      } catch (error) {
        // If the error is already in the expected format, rethrow it
        if (error && typeof error === 'object' && 'error' in error) {
          throw error as TError
        }

        // Otherwise, convert it to the expected format
        const apiError = {
          error: 'UnknownError',
          message:
            error instanceof Error
              ? error.message
              : 'An unknown error occurred',
        } as TError

        throw apiError
      }
    },
    ...queryOptions,
  })
}

export function useApiMutation<
  TData,
  TVariables extends Record<string, unknown>,
  TError = ApiErrorResponse,
>(
  endpointTemplate: string,
  options?: Omit<
    UseMutationOptions<TData, TError, TVariables>,
    'mutationFn'
  > & {
    requireAuth?: boolean
    method?: 'POST' | 'PUT' | 'DELETE' | 'PATCH'
    getEndpoint?: (variables: TVariables) => string
  },
) {
  const { getToken } = useAuth()
  const {
    requireAuth = true,
    method = 'POST',
    getEndpoint,
    ...mutationOptions
  } = options || {}

  return useMutation<TData, TError, TVariables>({
    mutationFn: async (variables) => {
      const token = requireAuth ? await getToken() : null
      // Use the dynamic endpoint if provided, otherwise use the template
      const endpoint = getEndpoint ? getEndpoint(variables) : endpointTemplate
      return webApiClient.fetchWithAuth<TData>(
        endpoint,
        {
          method,
          body: JSON.stringify(variables),
        },
        token,
      )
    },
    ...mutationOptions,
  })
}
