import { z } from 'zod'
import { ApiErrorResponseSchema } from '../../../shared'

// Request body schema
export const AddItemsRequestBodySchema = z.object({
  items: z.array(
    z.object({
      userPlaceId: z.string(),
    }),
  ),
})

// Request params schema
export const AddItemsRequestParamsSchema = z.object({
  id: z.string().uuid(),
})

// Response schema (success)
export const AddItemsResponseSchema = z.object({
  success: z.boolean(),
  duplicates: z.array(z.number()),
  added: z.array(z.number()),
})

// API response (success | error)
export const AddItemsApiResponseSchema = z.union([
  AddItemsResponseSchema,
  ApiErrorResponseSchema,
])

// Inferred types
export type AddItemsRequestBody = z.infer<typeof AddItemsRequestBodySchema>
export type AddItemsRequestParams = z.infer<typeof AddItemsRequestParamsSchema>
export type AddItemsResponse = z.infer<typeof AddItemsResponseSchema>
export type AddItemsApiResponse = z.infer<typeof AddItemsApiResponseSchema>
