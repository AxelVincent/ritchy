import { z } from 'zod'
import { ApiErrorResponseSchema, LocalizedTextSchema } from '../../../shared'

// Params schema
export const GetReviewsParamsSchema = z.object({
  userPlaceId: z.string(),
})

// Review schema
export const ReviewSchema = z.object({
  name: z.string(),
  text: LocalizedTextSchema.optional(),
  originalText: LocalizedTextSchema.optional(),
  rating: z.number().min(1).max(5),
  authorAttribution: z
    .object({
      displayName: z.string().optional(),
      uri: z.string().optional(),
      photoUri: z.string().optional(),
    })
    .optional(),
  publishTime: z.string(),
  googleMapsUri: z.string(),
})

// Response schema (success)
export const GetReviewsResponseSchema = z.object({
  reviews: z.array(ReviewSchema),
})

// API response (success | error)
export const GetReviewsApiResponseSchema = z.union([
  GetReviewsResponseSchema,
  ApiErrorResponseSchema,
])

// Inferred types
export type GetReviewsParams = z.infer<typeof GetReviewsParamsSchema>
export type Review = z.infer<typeof ReviewSchema>
export type GetReviewsResponse = z.infer<typeof GetReviewsResponseSchema>
export type GetReviewsApiResponse = z.infer<typeof GetReviewsApiResponseSchema>
