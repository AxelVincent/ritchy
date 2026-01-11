import { useApiQuery } from '@/hooks/useApi'
import {
  type UserMeApiResponse,
  type UserMeData,
  UserMeDataSchema,
} from '@api/routes_web/users/get-me/contract'
import type { ApiErrorResponse } from '@api/shared'

export const userKeys = {
  all: ['users'] as const,
  me: () => [...userKeys.all, 'me'] as const,
}

export const useUserMe = () => {
  return useApiQuery<UserMeApiResponse, UserMeData, ApiErrorResponse>(
    '/users/me',
    userKeys.me(),
    {
      zodSchema: UserMeDataSchema,
      retry: false,
    },
  )
}
