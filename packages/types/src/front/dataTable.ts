import { z } from 'zod'
import { EnrichResponseSchema } from '../api/enrich'
import { PlaceSchema } from '../api/places/places'

// Define enrichment schema to match EnrichResponseSchema + loading states
export const enrichmentSchema = EnrichResponseSchema.extend({
  isLoading: z.boolean().optional(),
  error: z.string().optional(),
})

export const searchResultSchema = PlaceSchema.extend({
  asyncScore: z
    .object({
      score: z.number().optional(),
      isLoading: z.boolean().optional(),
      error: z.string().optional(),
    })
    .optional(),
  enrichment: enrichmentSchema.optional(),
})

export type SearchResult = z.infer<typeof searchResultSchema>
export type EnrichmentState = z.infer<typeof enrichmentSchema>
