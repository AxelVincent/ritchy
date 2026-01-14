import { apiKeysKeys } from '@/api/queries/api-keys/keys'
import { useApiMutation } from '@/hooks/useApi'
import type {
  CreateApiKeyRequest,
  CreateApiKeyResponse,
} from '@api/routes_web/api_keys/create/contract'
import { useQueryClient } from '@tanstack/react-query'

export const useCreateApiKey = () => {
  const queryClient = useQueryClient()

  return useApiMutation<CreateApiKeyResponse, CreateApiKeyRequest>(
    '/api-keys',
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: apiKeysKeys.all })
      },
    },
  )
}
