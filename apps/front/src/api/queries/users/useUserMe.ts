import { useApiQuery } from '@/hooks/useApi'
import {
  type ApiErrorResponse,
  type UserMeApiResponse,
  type UserMeData,
  UserMeDataSchema,
} from '@ritchy/types'

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
