import { z } from 'zod'
import { ApiErrorResponseSchema, PaginationMetaSchema } from './common'
import { PlaceSchema } from './places'

// ============================================================================
// List Content Filters
// ============================================================================

// List content filters for server-side filtering
export const ListContentFiltersSchema = z.object({
  // List filter - filter by places belonging to specific lists
  listIds: z
    .union([z.string().uuid(), z.array(z.string().uuid())])
    .transform((val) => (Array.isArray(val) ? val : [val]))
    .optional(),

  // Text search (ILIKE) - case insensitive partial match
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

  // Multi-select location filters (WHERE IN)
  country: z
    .union([z.string(), z.array(z.string())])
    .transform((val) => (Array.isArray(val) ? val : [val]))
    .optional(),
  locality: z
    .union([z.string(), z.array(z.string())])
    .transform((val) => (Array.isArray(val) ? val : [val]))
    .optional(),

  // Multi-select filters (WHERE IN)
  status: z
    .union([z.string(), z.array(z.string())])
    .transform((val) => (Array.isArray(val) ? val : [val]))
    .optional(),
  primaryType: z
    .union([z.string(), z.array(z.string())])
    .transform((val) => (Array.isArray(val) ? val : [val]))
    .optional(),
  types: z
    .union([z.string(), z.array(z.string())])
    .transform((val) => (Array.isArray(val) ? val : [val]))
    .optional(),
  workforceRange: z
    .union([z.string(), z.array(z.string())])
    .transform((val) => (Array.isArray(val) ? val : [val]))
    .optional(),
  source: z
    .union([z.string(), z.array(z.string())])
    .transform((val) => (Array.isArray(val) ? val : [val]))
    .optional(),
  priceLevel: z
    .union([z.string(), z.array(z.string())])
    .transform((val) => (Array.isArray(val) ? val : [val]))
    .optional(),
  technologies: z
    .union([z.string(), z.array(z.string())])
    .transform((val) => (Array.isArray(val) ? val : [val]))
    .optional(),

  // Range filters (BETWEEN / >= / <=)
  ratingMin: z.coerce.number().min(0).max(5).optional(),
  ratingMax: z.coerce.number().min(0).max(5).optional(),
  ratingCountMin: z.coerce.number().min(0).optional(),
  ratingCountMax: z.coerce.number().optional(),

  // Date range filters (ISO date strings)
  dateOfCreationFrom: z.string().optional(),
  dateOfCreationTo: z.string().optional(),
  domainRegisteredAtFrom: z.string().optional(),
  domainRegisteredAtTo: z.string().optional(),
  lastInteractionAtFrom: z.string().optional(),
  lastInteractionAtTo: z.string().optional(),

  // Semantic search filter (RAG-based website content matching)
  semanticQuery: z.string().optional(),
  semanticThreshold: z.coerce.number().min(-1).max(1).optional(),
})

export type ListContentFilters = z.infer<typeof ListContentFiltersSchema>

// ============================================================================
// Request Schemas
// ============================================================================

// Helper for multi-select params (can be string or array from query string)
const multiSelectParam = z
  .union([z.string(), z.array(z.string())])
  .transform((val) => (Array.isArray(val) ? val : val ? [val] : undefined))
  .optional()

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

// Query type exports
export type FilterQueryParams = z.infer<typeof FilterQueryParamsSchema>
export type GetUserPlacesQuery = z.infer<typeof GetUserPlacesQuerySchema>
export type UserPlacesQuery = GetUserPlacesQuery

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Extract pagination params from parsed query
 */
export const extractPaginationParams = (query: GetUserPlacesQuery) => ({
  page: query.page ?? 1,
  pageSize: query.pageSize ?? 50,
})

/**
 * Extract filter params from parsed query (removes undefined values)
 */
export const extractFilterParams = (
  query: FilterQueryParams,
): ListContentFilters => {
  const filters = {
    listIds: query.listIds,
    search: query.search,
    name: query.name,
    country: query.country,
    locality: query.locality,
    postalCode: query.postalCode,
    street: query.street,
    website: query.website,
    phone: query.phone,
    facebookUrl: query.facebookUrl,
    instagramUrl: query.instagramUrl,
    linkedinUrl: query.linkedinUrl,
    email: query.email,
    shortDescription: query.shortDescription,
    sourceUrl: query.sourceUrl,
    status: query.status,
    primaryType: query.primaryType,
    types: query.types,
    workforceRange: query.workforceRange,
    source: query.source,
    priceLevel: query.priceLevel,
    technologies: query.technologies,
    ratingMin: query.ratingMin,
    ratingMax: query.ratingMax,
    ratingCountMin: query.ratingCountMin,
    ratingCountMax: query.ratingCountMax,
    dateOfCreationFrom: query.dateOfCreationFrom,
    dateOfCreationTo: query.dateOfCreationTo,
    domainRegisteredAtFrom: query.domainRegisteredAtFrom,
    domainRegisteredAtTo: query.domainRegisteredAtTo,
    // Semantic search
    semanticQuery: query.semanticQuery,
    semanticThreshold: query.semanticThreshold,
  }

  // Remove undefined values
  return Object.fromEntries(
    Object.entries(filters).filter(([_, v]) => v !== undefined),
  ) as ListContentFilters
}

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

// Main response schema
export const GetUserPlacesResponseSchema = z.object({
  items: z.array(PlaceSchema),
  pagination: PaginationMetaSchema,
  context: UserPlacesContextSchema.optional(),
})

export const GetUserPlacesApiResponseSchema = z.union([
  GetUserPlacesResponseSchema,
  ApiErrorResponseSchema,
])

export type UserPlacesContext = z.infer<typeof UserPlacesContextSchema>
export type GetUserPlacesResponse = z.infer<typeof GetUserPlacesResponseSchema>
export type GetUserPlacesApiResponse = z.infer<
  typeof GetUserPlacesApiResponseSchema
>

// ============================================================================
// Markers Schema
// ============================================================================

// Markers response schema (lightweight for map)
export const UserPlaceMarkerSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.string().nullable(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
})

export type UserPlaceMarker = z.infer<typeof UserPlaceMarkerSchema>

// ============================================================================
// Type Aliases for Backward Compatibility
// ============================================================================

// ContentFilters is an alias for ListContentFilters
export type ContentFilters = ListContentFilters
export { ListContentFiltersSchema as ContentFiltersSchema }

// ============================================================================
// Filter Options
// ============================================================================

// Filter options response schema
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

export type GetUserPlaceFilterOptionsResponse = z.infer<
  typeof GetUserPlaceFilterOptionsResponseSchema
>

// Type alias for backward compatibility
export type ListFilterOptions = GetUserPlaceFilterOptionsResponse

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Build query string from params object.
 * Handles arrays by appending multiple values with the same key.
 */
export const buildQueryString = (params: Record<string, unknown>): string => {
  const searchParams = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue

    if (Array.isArray(value)) {
      // Handle array params (multi-select filters)
      for (const item of value) {
        searchParams.append(key, String(item))
      }
    } else {
      searchParams.append(key, String(value))
    }
  }

  return searchParams.toString()
}

// Note: serializeFiltersToParams and deserializeFiltersFromParams are exported from filters.ts

// ============================================================================
// Item Page Response
// ============================================================================

export const GetUserPlacePageResponseSchema = z.object({
  page: z.number(),
  index: z.number(),
})

export const GetUserPlacePageApiResponseSchema = z.union([
  GetUserPlacePageResponseSchema,
  ApiErrorResponseSchema,
])

export type GetUserPlacePageResponse = z.infer<
  typeof GetUserPlacePageResponseSchema
>
export type GetUserPlacePageApiResponse = z.infer<
  typeof GetUserPlacePageApiResponseSchema
>
