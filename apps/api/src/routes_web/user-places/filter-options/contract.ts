import { z } from 'zod'
import { ApiErrorResponseSchema } from '../../../shared'

// ============================================================================
// Request Schema
// ============================================================================

// GET /user-places/filter-options - filter options endpoint (scope only)
export const GetUserPlaceFilterOptionsQuerySchema = z.object({
  listId: z.string().uuid().optional(),
  searchId: z.string().uuid().optional(),
})

// ============================================================================
// Response Schemas
// ============================================================================

// Success response
export const GetUserPlaceFilterOptionsResponseSchema = z.object({
  status: z.array(z.string()),
  primaryType: z.array(z.string()),
  types: z.array(z.string()),
  country: z.array(z.string()),
  locality: z.array(z.string()),
  postalCode: z.array(z.string()),
  source: z.array(z.string()),
  workforceRange: z.array(z.string()),
  priceLevel: z.array(z.string()),
  technologies: z.array(z.string()),
  lists: z.array(z.string()),
})

// API response (success | error)
export const GetUserPlaceFilterOptionsApiResponseSchema = z.union([
  GetUserPlaceFilterOptionsResponseSchema,
  ApiErrorResponseSchema,
])

// ============================================================================
// Inferred Types
// ============================================================================

export type GetUserPlaceFilterOptionsQuery = z.infer<
  typeof GetUserPlaceFilterOptionsQuerySchema
>
export type GetUserPlaceFilterOptionsResponse = z.infer<
  typeof GetUserPlaceFilterOptionsResponseSchema
>
export type GetUserPlaceFilterOptionsApiResponse = z.infer<
  typeof GetUserPlaceFilterOptionsApiResponseSchema
>
