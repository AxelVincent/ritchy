import { apiKeysKeys } from '@/api/queries/api-keys/keys'
import { useApiMutation } from '@/hooks/useApi'
import type {
  RevokeApiKeyParams,
  RevokeApiKeyResponse,
} from '@api/routes_web/api_keys/revoke/contract'
import { useQueryClient } from '@tanstack/react-query'

export const useRevokeApiKey = () => {
  const queryClient = useQueryClient()

  return useApiMutation<RevokeApiKeyResponse, RevokeApiKeyParams>('/api-keys', {
    method: 'DELETE',
    getEndpoint: ({ id }) => `/api-keys/${id}`,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiKeysKeys.all })
    },
  })
}
