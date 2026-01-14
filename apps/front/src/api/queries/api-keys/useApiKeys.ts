import { useApiQuery } from '@/hooks/useApi'
import { ApiKeyListItemSchema } from '@api/routes_web/api_keys/list/contract'
import { z } from 'zod'
import { apiKeysKeys } from './keys'

// Schema for the response - extracts just the data array
const ApiKeysDataSchema = z
  .object({
    success: z.boolean(),
    data: z.array(ApiKeyListItemSchema),
  })
  .transform((res) => res.data)

type ApiKeysData = z.infer<typeof ApiKeysDataSchema>

type ApiKeysRawResponse = {
  success: boolean
  data: z.infer<typeof ApiKeyListItemSchema>[]
}

export const useApiKeys = () => {
  return useApiQuery<ApiKeysRawResponse, ApiKeysData>(
    '/api-keys',
    apiKeysKeys.list(),
    {
      zodSchema: ApiKeysDataSchema,
    },
  )
}
