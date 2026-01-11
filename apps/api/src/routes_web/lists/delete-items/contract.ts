import { z } from 'zod'
import { ApiErrorResponseSchema } from '../../../shared'

// Request body schema
export const DeleteItemsRequestBodySchema = z.object({
  items: z.array(z.string()),
})

// Request params schema
export const DeleteItemsRequestParamsSchema = z.object({
  id: z.string().uuid(),
})

// Response schema (success)
export const DeleteItemsResponseSchema = z.object({
  success: z.boolean(),
})

// API response (success | error)
export const DeleteItemsApiResponseSchema = z.union([
  DeleteItemsResponseSchema,
  ApiErrorResponseSchema,
])

// Inferred types
export type DeleteItemsRequestBody = z.infer<
  typeof DeleteItemsRequestBodySchema
>
export type DeleteItemsRequestParams = z.infer<
  typeof DeleteItemsRequestParamsSchema
>
export type DeleteItemsResponse = z.infer<typeof DeleteItemsResponseSchema>
export type DeleteItemsApiResponse = z.infer<
  typeof DeleteItemsApiResponseSchema
>
