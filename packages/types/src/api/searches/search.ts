import { z } from 'zod'
import { ApiErrorResponseSchema, RectangleSchema } from '../../common'
import { SearchModelEnum } from '../payments/checkout'
import { PlaceSchema } from '../places'

export const SearchItemSchema = z.object({
  id: z.string().uuid(),
  locationFormatted: z.string().min(1),
  keyword: z.string().min(1),
  model: SearchModelEnum,
  rectangle: RectangleSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const SearchSchema = z.array(SearchItemSchema)

export type SearchItem = z.infer<typeof SearchItemSchema>
export type Search = z.infer<typeof SearchSchema>

export const CreateSearchRequestBodySchema = z.object({
  rectangle: RectangleSchema,
  placeName: z.string(),
  keyword: z.string(),
  model: SearchModelEnum,
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

export const GetSearchContentResponseSchema = z.array(PlaceSchema)

export type GetSearchContentResponse = z.infer<
  typeof GetSearchContentResponseSchema
>

export const GetSearchContentRequestParamsSchema = z.object({
  searchId: z.string().uuid(),
})

export const GetSearchContentApiResponseSchema = z.union([
  GetSearchContentResponseSchema,
  ApiErrorResponseSchema,
])

export type GetSearchContentRequestParams = z.infer<
  typeof GetSearchContentRequestParamsSchema
>

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

export type GetSearchContentApiResponse = z.infer<
  typeof GetSearchContentApiResponseSchema
>
