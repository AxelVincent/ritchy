import { z } from 'zod'
import { ApiErrorResponseSchema } from '../common'
import { PlaceSchema } from './places/places'

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

export const SearchModelEnum = z.enum([
  'ESSENTIALS',
  'NAVIGATOR',
  'EXPLORER',
  'PRO',
])
export type SearchModel = z.infer<typeof SearchModelEnum>

const CoordinateSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
})

export const RectangleSchema = z.object({
  northEast: CoordinateSchema,
  southWest: CoordinateSchema,
})

export type Coordinate = z.infer<typeof CoordinateSchema>
export type Rectangle = z.infer<typeof RectangleSchema>

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
