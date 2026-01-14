import { z } from 'zod'
import { ApiErrorResponseSchema } from '../../../shared'
import { FilterQueryParamsSchema } from '../get/contract'

// ============================================================================
// Request Schema
// ============================================================================

// GET /user-places/markers - markers endpoint (filters only, no pagination)
export const GetUserPlaceMarkersQuerySchema = FilterQueryParamsSchema

// ============================================================================
// Response Schemas
// ============================================================================

// Marker schema (lightweight for map)
export const UserPlaceMarkerSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.string().nullable(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
})

// Success response
export const GetUserPlaceMarkersResponseSchema = z.object({
  markers: z.array(UserPlaceMarkerSchema),
  totalCount: z.number(),
})

// API response (success | error)
export const GetUserPlaceMarkersApiResponseSchema = z.union([
  GetUserPlaceMarkersResponseSchema,
  ApiErrorResponseSchema,
])

// ============================================================================
// Inferred Types
// ============================================================================

export type GetUserPlaceMarkersQuery = z.infer<
  typeof GetUserPlaceMarkersQuerySchema
>
export type UserPlaceMarker = z.infer<typeof UserPlaceMarkerSchema>
export type GetUserPlaceMarkersResponse = z.infer<
  typeof GetUserPlaceMarkersResponseSchema
>
export type GetUserPlaceMarkersApiResponse = z.infer<
  typeof GetUserPlaceMarkersApiResponseSchema
>
