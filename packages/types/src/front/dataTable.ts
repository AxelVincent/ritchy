import type { z } from 'zod'
import { EnrichResponseSchema } from '../api/enrich'
import { PlaceSchema } from '../api/places/places'

// Define enrichment schema to match pure data from EnrichResponseSchema
export const enrichmentSchema = EnrichResponseSchema

export const searchResultSchema = PlaceSchema.extend({
  enrichment: enrichmentSchema.optional(),
})

export type SearchResult = z.infer<typeof searchResultSchema>
export type EnrichmentState = z.infer<typeof enrichmentSchema>

// UI-specific type that extends EnrichmentState with loading states
export type EnrichmentWithStatus = EnrichmentState & {
  isLoading?: boolean
  error?: string
}
