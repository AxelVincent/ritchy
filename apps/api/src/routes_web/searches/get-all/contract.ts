import { z } from 'zod'
import { ApiErrorResponseSchema, RectangleSchema } from '../../../shared'

// Search model enum (shared with create)
export const SearchModelEnum = z.enum([
  'BASIC',
  'ENHANCED',
  'ADVANCED',
  'EXPERT',
])

// Search item schema
export const SearchItemSchema = z.object({
  id: z.string().uuid(),
  locationFormatted: z.string(), // Allow empty strings for legacy data
  keyword: z.string().min(1),
  model: SearchModelEnum,
  rectangle: RectangleSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
})

// Response schema (success)
export const GetSearchesResponseSchema = z.object({
  searches: z.array(SearchItemSchema),
})

// API response (success | error)
export const GetSearchesApiResponseSchema = z.union([
  GetSearchesResponseSchema,
  ApiErrorResponseSchema,
])

// Inferred types
export type SearchItem = z.infer<typeof SearchItemSchema>
export type GetSearchesResponse = z.infer<typeof GetSearchesResponseSchema>
export type GetSearchesApiResponse = z.infer<
  typeof GetSearchesApiResponseSchema
>
