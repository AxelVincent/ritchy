import { z } from 'zod'
import {
  ApiErrorResponseSchema,
  PaginationMetaSchema,
  PlaceSchema,
} from '../../../shared'

// ============================================================================
// Shared Helpers
// ============================================================================

// Helper for multi-select params (can be string or array from query string)
const multiSelectParam = z
  .union([z.string(), z.array(z.string())])
  .transform((val) => (Array.isArray(val) ? val : val ? [val] : undefined))
  .optional()

// ============================================================================
// Request Schemas
// ============================================================================

// Shared query params for filters (used by multiple endpoints)
export const FilterQueryParamsSchema = z.object({
  // Scope filters
  listId: z.string().uuid().optional(),
  listIds: z
    .union([z.string().uuid(), z.array(z.string().uuid())])
    .transform((val) => (Array.isArray(val) ? val : val ? [val] : undefined))
    .optional(),
  searchId: z.string().uuid().optional(),

  // Text filters
  search: z.string().optional(),
  name: z.string().optional(),
  postalCode: z.string().optional(),
  street: z.string().optional(),
  website: z.string().optional(),
  phone: z.string().optional(),
  facebookUrl: z.string().optional(),
  instagramUrl: z.string().optional(),
  linkedinUrl: z.string().optional(),
  email: z.string().optional(),
  shortDescription: z.string().optional(),
  sourceUrl: z.string().optional(),

  // Multi-select location filters
  country: multiSelectParam,
  locality: multiSelectParam,

  // Multi-select filters
  status: multiSelectParam,
  primaryType: multiSelectParam,
  types: multiSelectParam,
  workforceRange: multiSelectParam,
  source: multiSelectParam,
  priceLevel: multiSelectParam,
  technologies: multiSelectParam,

  // Range filters
  ratingMin: z.coerce.number().min(0).max(5).optional(),
  ratingMax: z.coerce.number().min(0).max(5).optional(),
  ratingCountMin: z.coerce.number().min(0).optional(),
  ratingCountMax: z.coerce.number().optional(),

  // Date range filters
  dateOfCreationFrom: z.string().optional(),
  dateOfCreationTo: z.string().optional(),
  domainRegisteredAtFrom: z.string().optional(),
  domainRegisteredAtTo: z.string().optional(),

  // Semantic search filter (RAG-based website content matching)
  semanticQuery: z.string().optional(),
  semanticThreshold: z.coerce.number().min(0).max(1).optional(),
})

// GET /user-places - main endpoint query params (full query schema with pagination)
export const GetUserPlacesQuerySchema = FilterQueryParamsSchema.extend({
  // Pagination
  page: z.coerce.number().min(1).optional(),
  pageSize: z.coerce.number().min(1).max(100).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
})

// Alias for backend compatibility
export const UserPlacesQuerySchema = GetUserPlacesQuerySchema

// ============================================================================
// Response Schemas
// ============================================================================

// Context metadata - describes what scope the response is for
export const UserPlacesContextSchema = z.object({
  type: z.enum(['all', 'list', 'search']),
  // List context
  listId: z.string().uuid().optional(),
  listName: z.string().optional(),
  listEmoji: z.string().optional(),
  listCreatedAt: z.string().optional(),
  listUpdatedAt: z.string().optional(),
  // Search context
  searchId: z.string().uuid().optional(),
  searchKeyword: z.string().optional(),
  searchModel: z.string().optional(),
  searchCreatedAt: z.string().optional(),
})

// Main response schema (success)
export const GetUserPlacesResponseSchema = z.object({
  items: z.array(PlaceSchema),
  pagination: PaginationMetaSchema,
  context: UserPlacesContextSchema.optional(),
})

// API response (success | error)
export const GetUserPlacesApiResponseSchema = z.union([
  GetUserPlacesResponseSchema,
  ApiErrorResponseSchema,
])

// ============================================================================
// Inferred Types
// ============================================================================

export type FilterQueryParams = z.infer<typeof FilterQueryParamsSchema>
export type GetUserPlacesQuery = z.infer<typeof GetUserPlacesQuerySchema>
export type UserPlacesQuery = GetUserPlacesQuery
export type UserPlacesContext = z.infer<typeof UserPlacesContextSchema>
export type GetUserPlacesResponse = z.infer<typeof GetUserPlacesResponseSchema>
export type GetUserPlacesApiResponse = z.infer<
  typeof GetUserPlacesApiResponseSchema
>
