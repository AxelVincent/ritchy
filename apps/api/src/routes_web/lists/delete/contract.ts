import { z } from 'zod'
import { ApiErrorResponseSchema } from '../../../shared'

// Request params schema
export const DeleteListRequestParamsSchema = z.object({
  id: z.string().uuid(),
})

// Response schema (success)
export const DeleteListResponseSchema = z.object({
  success: z.boolean(),
})

// API response (success | error)
export const DeleteListApiResponseSchema = z.union([
  DeleteListResponseSchema,
  ApiErrorResponseSchema,
])

// Inferred types
export type DeleteListRequestParams = z.infer<
  typeof DeleteListRequestParamsSchema
>
export type DeleteListResponse = z.infer<typeof DeleteListResponseSchema>
export type DeleteListApiResponse = z.infer<typeof DeleteListApiResponseSchema>
