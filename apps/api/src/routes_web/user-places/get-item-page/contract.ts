import { z } from 'zod'
import { ApiErrorResponseSchema } from '../../../shared'
import { FilterQueryParamsSchema } from '../get/contract'

// ============================================================================
// Request Schemas
// ============================================================================

// GET /user-places/items/:itemId/page - item page lookup
export const GetUserPlaceItemPageParamsSchema = z.object({
  itemId: z.string().uuid(),
})

export const GetUserPlaceItemPageQuerySchema = FilterQueryParamsSchema.extend({
  pageSize: z.coerce.number().min(1).max(100).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
})

// ============================================================================
// Response Schemas
// ============================================================================

// Success response
export const GetUserPlacePageResponseSchema = z.object({
  page: z.number(),
  index: z.number(),
})

// API response (success | error)
export const GetUserPlacePageApiResponseSchema = z.union([
  GetUserPlacePageResponseSchema,
  ApiErrorResponseSchema,
])

// ============================================================================
// Inferred Types
// ============================================================================

export type GetUserPlaceItemPageParams = z.infer<
  typeof GetUserPlaceItemPageParamsSchema
>
export type GetUserPlaceItemPageQuery = z.infer<
  typeof GetUserPlaceItemPageQuerySchema
>
export type GetUserPlacePageResponse = z.infer<
  typeof GetUserPlacePageResponseSchema
>
export type GetUserPlacePageApiResponse = z.infer<
  typeof GetUserPlacePageApiResponseSchema
>
