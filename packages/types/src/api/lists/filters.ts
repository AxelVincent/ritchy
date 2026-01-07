import { z } from 'zod'

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
  // semanticQuery: natural language query to match against indexed website content
  // semanticThreshold: minimum cosine similarity (-1 to 1, higher = more strict). Default 0.4 in semantic_search_domains.ts
  semanticQuery: z.string().optional(),
  semanticThreshold: z.coerce.number().min(-1).max(1).optional(),
})

export type ListContentFilters = z.infer<typeof ListContentFiltersSchema>

// Marker schema for lightweight map data
export const MarkerSchema = z.object({
  id: z.string(),
  name: z.string(),
  emoji: z.string(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
})

export const GetListMarkersResponseSchema = z.object({
  markers: z.array(MarkerSchema),
  totalCount: z.number(),
})

export type Marker = z.infer<typeof MarkerSchema>
export type GetListMarkersResponse = z.infer<
  typeof GetListMarkersResponseSchema
>

// Item page lookup response (for pin click navigation)
export const GetItemPageResponseSchema = z.object({
  page: z.number(),
  index: z.number(),
})

export type GetItemPageResponse = z.infer<typeof GetItemPageResponseSchema>
