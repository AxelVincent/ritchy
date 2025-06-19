import { hubspotKeys } from '@/api/queries/integrations/hubspot/oauth'
import { useApiMutation } from '@/hooks/useApi'
import type { OAuthDisconnectResponse } from '@ritchy/types'
import { useQueryClient } from '@tanstack/react-query'

export const useHubspotDisconnect = () => {
  const queryClient = useQueryClient()

  return useApiMutation<void, OAuthDisconnectResponse>(
    '/hubspot/oauth/disconnect',
    {
      method: 'POST',
      onSuccess: async () => {
        // Invalidate and immediately refetch
        await queryClient.invalidateQueries({
          queryKey: hubspotKeys.status(),
          refetchType: 'active', // Force refetch of active queries
        })
      },
    },
  )
}
