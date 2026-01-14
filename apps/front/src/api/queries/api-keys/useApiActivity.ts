import { useApiQuery } from '@/hooks/useApi'
import {
  type ApiActivityLogItem,
  ApiActivityLogItemSchema,
} from '@api/routes_web/api_keys/activity/contract'
import { type PaginationMeta, PaginationMetaSchema } from '@api/shared'
import { z } from 'zod'
import { type ApiActivityFilters, apiKeysKeys } from './keys'

const ApiActivityDataSchema = z
  .object({
    success: z.boolean(),
    data: z.object({
      items: z.array(ApiActivityLogItemSchema),
      pagination: PaginationMetaSchema,
    }),
  })
  .transform((res) => res.data)

type ApiActivityData = z.infer<typeof ApiActivityDataSchema>

type ApiActivityRawResponse = {
  success: boolean
  data: {
    items: ApiActivityLogItem[]
    pagination: PaginationMeta
  }
}

const buildQueryString = (filters: ApiActivityFilters): string => {
  const params = new URLSearchParams()

  if (filters.page !== undefined) {
    params.append('page', String(filters.page))
  }
  if (filters.pageSize !== undefined) {
    params.append('pageSize', String(filters.pageSize))
  }
  if (filters.keyId !== undefined) {
    params.append('keyId', filters.keyId)
  }
  if (filters.statusCode !== undefined) {
    params.append('statusCode', String(filters.statusCode))
  }

  return params.toString()
}

export const useApiActivity = (filters: ApiActivityFilters = {}) => {
  const queryString = buildQueryString(filters)
  const endpoint = `/api-keys/activity${queryString ? `?${queryString}` : ''}`

  return useApiQuery<ApiActivityRawResponse, ApiActivityData>(
    endpoint,
    apiKeysKeys.activity(filters),
    {
      zodSchema: ApiActivityDataSchema,
      placeholderData: (previousData) => previousData,
    },
  )
}
