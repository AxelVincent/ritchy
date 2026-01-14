import { useApiQuery } from '@/hooks/useApi'
import { ApiUsageStatsSchema } from '@api/routes_web/api_keys/get-usage/contract'
import { z } from 'zod'
import { apiKeysKeys } from './keys'

// Schema for the response - extracts just the data
const ApiUsageDataSchema = z
  .object({
    success: z.boolean(),
    data: ApiUsageStatsSchema,
  })
  .transform((res) => res.data)

type ApiUsageData = z.infer<typeof ApiUsageDataSchema>

type ApiUsageRawResponse = {
  success: boolean
  data: z.infer<typeof ApiUsageStatsSchema>
}

export const useApiUsage = () => {
  return useApiQuery<ApiUsageRawResponse, ApiUsageData>(
    '/api-keys/usage',
    apiKeysKeys.usage(),
    {
      zodSchema: ApiUsageDataSchema,
      refetchInterval: 30000, // Refresh every 30 seconds
    },
  )
}
