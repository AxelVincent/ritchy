import { z } from 'zod'

export const searchHistoryItemSchema = z.object({
  id: z.string().uuid(),
  location_formatted: z.string().min(1),
  keyword: z.string().min(1),
  created_at: z.date(),
  updated_at: z.date(),
})

export const searchHistorySchema = z.array(searchHistoryItemSchema)

export type SearchHistoryItem = z.infer<typeof searchHistoryItemSchema>
export type SearchHistory = z.infer<typeof searchHistorySchema>

export const createSearchRequestBodySchema = z.object({
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
  radiusInMeters: z.number(),
  placeName: z.string(),
  keyword: z.string(),
  model: z.enum(['DEFAULT', 'NAVIGATOR', 'EXPLORER', 'PRO']),
})

export const createSearchApiResponseSchema = z.object({
  search_id: z.string().uuid(),
})

export type CreateSearchRequestBody = z.infer<
  typeof createSearchRequestBodySchema
>
export type CreateSearchApiResponse = z.infer<
  typeof createSearchApiResponseSchema
>
