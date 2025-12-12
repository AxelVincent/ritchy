import { z } from 'zod'
import { ApiErrorResponseSchema, PaginationMetaSchema } from '../../common'
import { PlaceSchema } from '../places/places'

// Re-export filters from lists (they're the same)
export { ListContentFiltersSchema as ContentFiltersSchema } from '../lists/filters'
export type { ListContentFilters as ContentFilters } from '../lists/filters'

// Import for internal use
import type { ListContentFilters as ContentFilters } from '../lists/filters'

// Re-export ListFilterOptions since user-places uses the same filter options structure
export type { ListFilterOptions } from '../lists/lists'

// ============================================================================
// Request Schemas (for validation middleware)
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

// GET /user-places/markers - markers endpoint (filters only, no pagination)
export const GetUserPlaceMarkersQuerySchema = FilterQueryParamsSchema

// GET /user-places/filter-options - filter options endpoint (scope only)
export const GetUserPlaceFilterOptionsQuerySchema = z.object({
  listId: z.string().uuid().optional(),
  searchId: z.string().uuid().optional(),
})

// GET /user-places/items/:itemId/page - item page lookup
export const GetUserPlaceItemPageParamsSchema = z.object({
  itemId: z.string().uuid(),
})

export const GetUserPlaceItemPageQuerySchema = FilterQueryParamsSchema.extend({
  pageSize: z.coerce.number().min(1).max(100).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
})

// Query type exports
export type FilterQueryParams = z.infer<typeof FilterQueryParamsSchema>
export type GetUserPlacesQuery = z.infer<typeof GetUserPlacesQuerySchema>
// Alias for backend compatibility
export type UserPlacesQuery = GetUserPlacesQuery
export type GetUserPlaceMarkersQuery = z.infer<
  typeof GetUserPlaceMarkersQuerySchema
>
export type GetUserPlaceFilterOptionsQuery = z.infer<
  typeof GetUserPlaceFilterOptionsQuerySchema
>
export type GetUserPlaceItemPageParams = z.infer<
  typeof GetUserPlaceItemPageParamsSchema
>
export type GetUserPlaceItemPageQuery = z.infer<
  typeof GetUserPlaceItemPageQuerySchema
>

// ============================================================================
// Sorting Configuration
// ============================================================================

/**
 * Valid sort columns for user places queries.
 * These map to database columns in the backend.
 */
export const USER_PLACES_SORT_COLUMNS = [
  'name',
  'rating',
  'ratingCount',
  'status',
  'country',
  'locality',
  'postalCode',
  'createdAt',
  'updatedAt',
  'lastInteractionAt',
  'dateOfCreation',
  'domainRegisteredAt',
  'workforceRange',
  'primaryType',
  'website',
  'searchPlaceCreatedAt', // Internal: used for search views to preserve enrichment score
] as const

export type UserPlacesSortColumn = (typeof USER_PLACES_SORT_COLUMNS)[number]

/**
 * Default sort configuration for user places queries
 */
export const USER_PLACES_DEFAULT_SORT = {
  sortBy: 'createdAt' as UserPlacesSortColumn,
  sortOrder: 'desc' as const,
} as const

/**
 * Compute the effective sort column based on context.
 * For search views, default/createdAt sorting uses searchPlaceCreatedAt
 * to preserve the enrichment score ordering from the search results.
 *
 * IMPORTANT: This logic must be used consistently in:
 * - Main user places query (getAggregatedUserPlaces)
 * - Item page lookup query (getFilteredPlaceIds)
 *
 * @param sortBy - The requested sort column (may be undefined)
 * @param searchId - The search ID if viewing search results
 * @returns The effective sort column to use
 */
export const getEffectiveSortColumn = (
  sortBy: string | undefined,
  searchId: string | undefined,
): UserPlacesSortColumn => {
  // For search views: use searchPlaceCreatedAt when sortBy is undefined or 'createdAt'
  // This preserves the enrichment score ordering from search results
  if (searchId && (!sortBy || sortBy === 'createdAt')) {
    return 'searchPlaceCreatedAt'
  }
  // For other cases, use the provided sortBy or fall back to default
  return (sortBy as UserPlacesSortColumn) || USER_PLACES_DEFAULT_SORT.sortBy
}

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
): ContentFilters => {
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
  }

  // Remove undefined values
  return Object.fromEntries(
    Object.entries(filters).filter(([_, v]) => v !== undefined),
  ) as ContentFilters
}

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

// ============================================================================
// Response Schemas
// ============================================================================

// Context metadata - describes what scope the response is for
// Includes all metadata previously returned by GetListContentResponse and GetSearchContentResponse
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

export const GetUserPlaceMarkersResponseSchema = z.object({
  markers: z.array(UserPlaceMarkerSchema),
  totalCount: z.number(),
})

export const GetUserPlaceMarkersApiResponseSchema = z.union([
  GetUserPlaceMarkersResponseSchema,
  ApiErrorResponseSchema,
])

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

export const GetUserPlaceFilterOptionsApiResponseSchema = z.union([
  GetUserPlaceFilterOptionsResponseSchema,
  ApiErrorResponseSchema,
])

// Item page lookup response (for pin click navigation)
export const GetUserPlacePageResponseSchema = z.object({
  page: z.number(),
  index: z.number(),
})

export const GetUserPlacePageApiResponseSchema = z.union([
  GetUserPlacePageResponseSchema,
  ApiErrorResponseSchema,
])

// Type exports
export type UserPlacesContext = z.infer<typeof UserPlacesContextSchema>
export type GetUserPlacesResponse = z.infer<typeof GetUserPlacesResponseSchema>
export type GetUserPlacesApiResponse = z.infer<
  typeof GetUserPlacesApiResponseSchema
>

export type UserPlaceMarker = z.infer<typeof UserPlaceMarkerSchema>
export type GetUserPlaceMarkersResponse = z.infer<
  typeof GetUserPlaceMarkersResponseSchema
>
export type GetUserPlaceMarkersApiResponse = z.infer<
  typeof GetUserPlaceMarkersApiResponseSchema
>

export type GetUserPlaceFilterOptionsResponse = z.infer<
  typeof GetUserPlaceFilterOptionsResponseSchema
>
export type GetUserPlaceFilterOptionsApiResponse = z.infer<
  typeof GetUserPlaceFilterOptionsApiResponseSchema
>

export type GetUserPlacePageResponse = z.infer<
  typeof GetUserPlacePageResponseSchema
>
export type GetUserPlacePageApiResponse = z.infer<
  typeof GetUserPlacePageApiResponseSchema
>
