import { useApiQuery } from '@/hooks/useApi'
import type { UserMeApiResponse } from '@ritchy/types'

export const userKeys = {
  all: ['users'] as const,
  me: () => [...userKeys.all, 'me'] as const,
}

// Define a success-only type
type SubscriptionSuccess = Extract<UserMeApiResponse, { plan: string }>

export const useUserMe = () => {
  return useApiQuery<UserMeApiResponse, SubscriptionSuccess>(
    '/users/me',
    userKeys.me(),
    {
      // Don't retry on error
      retry: false,
    },
  )
}

export function isMeSuccess(
  response: UserMeApiResponse,
): response is Extract<UserMeApiResponse, { plan: string }> {
  return 'plan' in response
}
