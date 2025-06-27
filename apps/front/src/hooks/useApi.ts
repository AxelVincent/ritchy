import { useAuth } from '@clerk/clerk-react'
import type { ApiErrorResponse } from '@ritchy/types'
import { ApiErrorResponseSchema } from '@ritchy/types'
import {
  type UseMutationOptions,
  type UseQueryOptions,
  useMutation,
  useQuery,
} from '@tanstack/react-query'
import type { z } from 'zod'
import { createApiClient } from '../lib/api/createApiClient'

// Create a single API client instance per base URL
const webApiClient = createApiClient({
  baseUrl: import.meta.env.VITE_API_WEB_BASE_URL || '/api/web',
})

export function useApiQuery<
  TQueryFnData,
  TData = TQueryFnData,
  TError = ApiErrorResponse,
>(
  endpoint: string,
  queryKey: readonly unknown[],
  //TODO: Make zodSchema required + infer TData from zodSchema automatically
  //Goal: Make the API client as type-safe as possible and remove type inference from the caller
  options?: Omit<
    UseQueryOptions<TQueryFnData, TError, TData, ReadonlyArray<unknown>>,
    'queryKey' | 'queryFn' | 'select'
  > & {
    zodSchema?: z.ZodType<TData, z.ZodTypeDef, TQueryFnData>
    requireAuth?: boolean
  },
) {
  const { getToken } = useAuth()
  const {
    requireAuth = true,
    zodSchema,
    ...queryOptionsFromFile
  } = options || {}

  const finalQueryOptions: Omit<
    UseQueryOptions<TQueryFnData, TError, TData, ReadonlyArray<unknown>>,
    'queryKey' | 'queryFn'
  > = {
    ...queryOptionsFromFile,
  }

  if (zodSchema) {
    finalQueryOptions.select = (rawData: TQueryFnData): TData => {
      const successParseResult = zodSchema.safeParse(rawData)
      if (successParseResult.success) {
        return successParseResult.data
      }

      const apiErrorParseResult = ApiErrorResponseSchema.safeParse(rawData)
      if (apiErrorParseResult.success) {
        throw apiErrorParseResult.data as TError
      }

      console.error(
        `Zod validation failed for endpoint: ${endpoint}. Expected schema: ${zodSchema.description || 'provided schema'}. Zod errors:`,
        (successParseResult as z.SafeParseError<TQueryFnData>).error.flatten(),
        'Raw data:',
        rawData,
      )
      throw new Error(
        `Invalid data structure received from ${endpoint}. Expected ${zodSchema.description || 'defined success schema'}.`,
      )
    }
  }

  return useQuery<TQueryFnData, TError, TData, ReadonlyArray<unknown>>({
    queryKey,
    retry: (failureCount, _error) => {
      if (failureCount >= 3) {
        return false
      }
      return true
    },
    queryFn: async ({ signal }) => {
      try {
        const token = requireAuth ? await getToken() : null
        return await webApiClient.fetchWithAuth<TQueryFnData>(
          endpoint,
          {
            signal,
            method: 'GET',
          },
          token,
        )
      } catch (error) {
        if (
          error &&
          typeof error === 'object' &&
          'error' in error &&
          'message' in error
        ) {
          throw error as TError
        }

        const apiError = {
          error: 'UnknownApiError',
          message:
            error instanceof Error
              ? error.message
              : 'An unknown API error occurred',
        } as TError

        throw apiError
      }
    },
    ...(finalQueryOptions as Omit<
      UseQueryOptions<TQueryFnData, TError, TData, ReadonlyArray<unknown>>,
      'queryKey' | 'queryFn'
    >),
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
    getBody?: (variables: TVariables) => Record<string, unknown>
  },
) {
  const { getToken } = useAuth()
  const {
    requireAuth = true,
    method = 'POST',
    getEndpoint,
    getBody,
    ...mutationOptions
  } = options || {}

  return useMutation<TData, TError, TVariables>({
    mutationFn: async (variables) => {
      const token = requireAuth ? await getToken() : null
      const endpoint = getEndpoint ? getEndpoint(variables) : endpointTemplate
      const body = getBody ? getBody(variables) : variables
      return webApiClient.fetchWithAuth<TData>(
        endpoint,
        {
          method,
          body: JSON.stringify(body),
        },
        token,
      )
    },
    ...mutationOptions,
  })
}
