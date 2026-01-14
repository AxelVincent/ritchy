import { useApiQuery } from '@/hooks/useApi'
import { z } from 'zod'
import { apiKeysKeys } from './keys'

const ApiKeySecretResponseSchema = z
  .object({
    success: z.boolean(),
    data: z.object({
      key: z.string(),
    }),
  })
  .transform((res) => res.data.key)

type ApiKeySecretRawResponse = {
  success: boolean
  data: { key: string }
}

export const useApiKeySecret = (keyId: string | null) => {
  return useApiQuery<ApiKeySecretRawResponse, string>(
    `/api-keys/${keyId}/secret`,
    apiKeysKeys.secret(keyId ?? ''),
    {
      zodSchema: ApiKeySecretResponseSchema,
      enabled: !!keyId,
    },
  )
}
