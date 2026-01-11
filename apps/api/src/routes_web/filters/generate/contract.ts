import { z } from 'zod'
import { FilterRuleSchema } from '../../../shared'

// Request schema
export const GenerateFiltersRequestSchema = z.object({
  query: z.string().min(1).max(500),
})

// Generated filter with confidence
export const GeneratedFilterSchema = z.object({
  rule: FilterRuleSchema,
  confidence: z.number().min(0).max(100),
  explanation: z.string(),
})

// Response schema (success)
export const GenerateFiltersResponseSchema = z.object({
  filters: z.array(GeneratedFilterSchema),
  semanticQuery: z.string().optional(),
  reasoning: z.string(),
})

// API response (success | error)
export const GenerateFiltersApiResponseSchema = z.union([
  GenerateFiltersResponseSchema,
  z.object({ error: z.string() }),
])

// Inferred types
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
