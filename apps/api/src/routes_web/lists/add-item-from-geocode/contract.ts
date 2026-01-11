import { z } from 'zod'
import { ApiErrorResponseSchema } from '../../../shared'

// Request body schema
export const AddItemFromGeocodeRequestBodySchema = z.object({
  googleMapsPlaceId: z.string(),
  listId: z.string(),
})

// Response schema (success)
export const AddItemFromGeocodeResponseSchema = z.object({
  success: z.boolean(),
})

// API response (success | error)
export const AddItemFromGeocodeApiResponseSchema = z.union([
  AddItemFromGeocodeResponseSchema,
  ApiErrorResponseSchema,
])

// Inferred types
export type AddItemFromGeocodeRequestBody = z.infer<
  typeof AddItemFromGeocodeRequestBodySchema
>
export type AddItemFromGeocodeResponse = z.infer<
  typeof AddItemFromGeocodeResponseSchema
>
export type AddItemFromGeocodeApiResponse = z.infer<
  typeof AddItemFromGeocodeApiResponseSchema
>
