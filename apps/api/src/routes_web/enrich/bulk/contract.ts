import { z } from 'zod'
import { ApiErrorResponseSchema } from '../../../shared'

// Request schema
export const BulkEnrichmentRequestSchema = z.object({
  userPlaceIds: z
    .array(z.string())
    .min(1, 'At least one place ID is required')
    .max(500, 'Maximum 500 places per bulk request'),
})

// Response schema (success)
export const BulkEnrichmentResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  enqueuedCount: z.number().min(0),
})

// API response (success | error)
export const BulkEnrichmentApiResponseSchema = z.union([
  BulkEnrichmentResponseSchema,
  ApiErrorResponseSchema,
])

// Inferred types
export type BulkEnrichmentRequest = z.infer<typeof BulkEnrichmentRequestSchema>
export type BulkEnrichmentResponse = z.infer<
  typeof BulkEnrichmentResponseSchema
>
export type BulkEnrichmentApiResponse = z.infer<
  typeof BulkEnrichmentApiResponseSchema
>
