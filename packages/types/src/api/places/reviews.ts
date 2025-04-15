import { z } from 'zod'
import { ApiErrorResponseSchema } from '../../common'
import { LocalizedTextSchema } from './places'

export const ReviewSchema = z.object({
  name: z.string(),
  relativePublishTimeDescription: z.string(),
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
  flagContentUri: z.string(),
  googleMapsUri: z.string(),
})

export const GetReviewsParamsSchema = z.object({
  placeId: z.string(),
})

export const GetReviewsResponseSchema = z.object({
  reviews: z.array(ReviewSchema),
})

export const GetReviewsRequestSchema = z.intersection(
  GetReviewsParamsSchema,
  z.object({
    limit: z.number().min(1).max(100).optional(),
    offset: z.number().min(0).optional(),
  }),
)

export const GetReviewsApiResponseSchema = z.union([
  GetReviewsResponseSchema,
  ApiErrorResponseSchema,
])

export type GetReviewsApiResponse = z.infer<typeof GetReviewsApiResponseSchema>
export type GetReviewsRequest = z.infer<typeof GetReviewsRequestSchema>
export type Review = z.infer<typeof ReviewSchema>
