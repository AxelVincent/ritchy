import { z } from 'zod'
import { FilterRuleSchema } from './index'

// ============================================
// AI FILTER GENERATION - REQUEST/RESPONSE
// ============================================

/**
 * Request schema for AI filter generation
 * User provides natural language query to be converted to structured filters
 */
export const GenerateFiltersRequestSchema = z.object({
  query: z.string().min(1).max(500),
})

/**
 * Generated filter with confidence score and explanation
 * Helps users understand why a filter was generated
 */
export const GeneratedFilterSchema = z.object({
  rule: FilterRuleSchema,
  confidence: z.number().min(0).max(100),
  explanation: z.string(),
})

/**
 * Successful response from AI filter generation
 * Contains structured filters and optional semantic query for fuzzy concepts
 */
export const GenerateFiltersResponseSchema = z.object({
  filters: z.array(GeneratedFilterSchema),
  // For concepts that can't be structured (e.g., "Italian", "eco-friendly")
  // Routes to existing semanticQuery filter
  semanticQuery: z.string().optional(),
  // Overall interpretation explanation shown to user
  reasoning: z.string(),
})

/**
 * API response - either success or error
 */
export const GenerateFiltersApiResponseSchema = z.union([
  GenerateFiltersResponseSchema,
  z.object({ error: z.string() }),
])

// Type exports
export type GenerateFiltersRequest = z.infer<
  typeof GenerateFiltersRequestSchema
>
export type GeneratedFilter = z.infer<typeof GeneratedFilterSchema>
export type GenerateFiltersResponse = z.infer<
  typeof GenerateFiltersResponseSchema
>
export type GenerateFiltersApiResponse = z.infer<
  typeof GenerateFiltersApiResponseSchema
>
