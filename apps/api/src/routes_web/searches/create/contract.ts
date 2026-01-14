import { z } from 'zod'
import { ApiErrorResponseSchema, RectangleSchema } from '../../../shared'

// Search model enum
export const SearchModelEnum = z.enum([
  'BASIC',
  'ENHANCED',
  'ADVANCED',
  'EXPERT',
])

// Search limit configuration
export const SEARCH_LIMIT = {
  MIN: 1,
  MAX: 240,
  DEFAULT: 60,
} as const

// Derive minimum required model from a given limit
export const getMinimumRequiredModel = (
  limit: number,
): z.infer<typeof SearchModelEnum> => {
  if (limit <= 60) return 'BASIC'
  if (limit <= 240) return 'ENHANCED'
  if (limit <= 960) return 'ADVANCED'
  return 'EXPERT'
}

// Request schema
export const CreateSearchRequestSchema = z.object({
  rectangle: RectangleSchema,
  placeName: z.string(),
  keyword: z.string(),
  model: SearchModelEnum,
  autoEnrich: z.boolean().optional(),
  limit: z
    .number()
    .int()
    .min(SEARCH_LIMIT.MIN)
    .max(SEARCH_LIMIT.MAX)
    .optional(),
})

// Response schema (success)
export const CreateSearchResponseSchema = z.object({
  id: z.string().uuid(),
  autoEnrichStarted: z.boolean().optional(),
  enqueuedCount: z.number().optional(),
  userPlaceIds: z.array(z.string().uuid()).optional(),
})

// API response (success | error)
export const CreateSearchApiResponseSchema = z.union([
  CreateSearchResponseSchema,
  ApiErrorResponseSchema,
])

// Inferred types
export type SearchModel = z.infer<typeof SearchModelEnum>
export type CreateSearchRequest = z.infer<typeof CreateSearchRequestSchema>
export type CreateSearchResponse = z.infer<typeof CreateSearchResponseSchema>
export type CreateSearchApiResponse = z.infer<
  typeof CreateSearchApiResponseSchema
>
