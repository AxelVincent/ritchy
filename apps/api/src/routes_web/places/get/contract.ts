import { z } from 'zod'
import { ApiErrorResponseSchema, PlaceSchema } from '../../../shared'

// Request schema
export const GetPlaceRequestParamsSchema = z.object({
  userPlaceId: z.string().uuid(),
})

// Response schema (success)
export const GetPlaceResponseSchema = z.object({
  place: PlaceSchema,
})

// API response (success | error)
export const GetPlaceApiResponseSchema = z.union([
  GetPlaceResponseSchema,
  ApiErrorResponseSchema,
])

// Inferred types
export type GetPlaceRequestParams = z.infer<typeof GetPlaceRequestParamsSchema>
export type GetPlaceResponse = z.infer<typeof GetPlaceResponseSchema>
export type GetPlaceApiResponse = z.infer<typeof GetPlaceApiResponseSchema>
