import { z } from 'zod'
import { ApiErrorResponseSchema } from '../common'

export const SearchItemSchema = z.object({
  id: z.string().uuid(),
  locationFormatted: z.string().min(1),
  keyword: z.string().min(1),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const SearchSchema = z.array(SearchItemSchema)

export type SearchItem = z.infer<typeof SearchItemSchema>
export type Search = z.infer<typeof SearchSchema>

export const CreateSearchRequestBodySchema = z.object({
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
  radiusInMeters: z.number(),
  placeName: z.string(),
  keyword: z.string(),
  model: z.enum(['DEFAULT', 'NAVIGATOR', 'EXPLORER', 'PRO']),
})

export const CreateSearchResponseSchema = z.object({
  id: z.string().uuid(),
})

export const CreateSearchApiResponseSchema = z.union([
  CreateSearchResponseSchema,
  ApiErrorResponseSchema,
])

export const GetSearchesResponseSchema = z.object({
  searches: SearchSchema,
})

export type GetSearchesResponse = z.infer<typeof GetSearchesResponseSchema>
export const GetSearchesApiResponseSchema = z.union([
  GetSearchesResponseSchema,
  ApiErrorResponseSchema,
])

export type GetSearchesApiResponse = z.infer<
  typeof GetSearchesApiResponseSchema
>

export type CreateSearchRequestBody = z.infer<
  typeof CreateSearchRequestBodySchema
>
export type CreateSearchApiResponse = z.infer<
  typeof CreateSearchApiResponseSchema
>
