import type { z } from 'zod'
import type { EnrichResponseSchema } from '../api/enrich'
import type { PlaceSchema } from '../api/places/places'

export type SearchResult = z.infer<typeof PlaceSchema>
export type EnrichmentState = z.infer<typeof EnrichResponseSchema>

// UI-specific type that extends EnrichmentState with loading states
export type EnrichmentWithStatus = EnrichmentState & {
  isLoading?: boolean
  error?: string
}
