import { z } from 'zod'
import { PaginationMetaSchema } from '../../../shared'

// Query params schema
export const GetApiActivityQuerySchema = z.object({
  page: z.coerce.number().min(1).optional(),
  pageSize: z.coerce.number().min(1).max(100).optional(),
  keyId: z.string().uuid().optional(),
  statusCode: z.coerce.number().optional(),
})

// Activity log item schema
export const ApiActivityLogItemSchema = z.object({
  id: z.string().uuid(),
  endpoint: z.string(),
  method: z.string(),
  statusCode: z.number(),
  creditsUsed: z.number(),
  latencyMs: z.number().nullable(),
  createdAt: z.string(),
  apiKeyName: z.string(),
  requestBody: z.unknown().nullable(),
  responseBody: z.unknown().nullable(),
})

// Response schema (success)
export const GetApiActivityResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    items: z.array(ApiActivityLogItemSchema),
    pagination: PaginationMetaSchema,
  }),
})

// Error response schema
export const GetApiActivityErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
})

// API response (success | error)
export const GetApiActivityApiResponseSchema = z.union([
  GetApiActivityResponseSchema,
  GetApiActivityErrorResponseSchema,
])

// Inferred types
export type GetApiActivityQuery = z.infer<typeof GetApiActivityQuerySchema>
export type ApiActivityLogItem = z.infer<typeof ApiActivityLogItemSchema>
export type GetApiActivityResponse = z.infer<
  typeof GetApiActivityResponseSchema
>
export type GetApiActivityApiResponse = z.infer<
  typeof GetApiActivityApiResponseSchema
>
