import { useApiQuery } from '@/hooks/useApi'
import type { UserSubscriptionApiResponse } from '@ritchy/types'

const userKeys = {
  all: ['users'] as const,
  subscription: () => [...userKeys.all, 'subscription'] as const,
}

// Define a success-only type
type SubscriptionSuccess = Extract<
  UserSubscriptionApiResponse,
  { plan: string }
>

export const useUserSubscription = () => {
  return useApiQuery<UserSubscriptionApiResponse, SubscriptionSuccess>(
    '/users/subscription',
    userKeys.subscription(),
    {
      // Don't retry on error
      retry: false,
    },
  )
}

export function isSubscriptionSuccess(
  response: UserSubscriptionApiResponse,
): response is Extract<UserSubscriptionApiResponse, { plan: string }> {
  return 'plan' in response
}
