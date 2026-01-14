import { useApiMutation } from '@/hooks/useApi'
import type { CreatePortalSessionApiResponse } from '@api/routes_web/payments/create-portal-session/contract'

export const useCreatePortalSession = () => {
  return useApiMutation<
    CreatePortalSessionApiResponse,
    Record<string, unknown>
  >('/payments/create-portal-session', {
    // Transform the response to return just the URL
    onSuccess: (data) => {
      if ('error' in data) {
        throw new Error(data.message || 'Failed to create portal session')
      }
      return data.url
    },
  })
}
