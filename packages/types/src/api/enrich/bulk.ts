import { z } from 'zod'
import { ApiErrorResponseSchema } from '../../common'

/**
 * Bulk enrichment request body schema
 * Used for bulk enriching multiple places by their IDs
 */
export const BulkEnrichmentRequestBodySchema = z.object({
  userPlaceIds: z
    .array(z.string())
    .min(1, 'At least one place ID is required')
    .max(500, 'Maximum 500 places per bulk request'),
})

/**
 * Bulk enrichment response schema
 */
export const BulkEnrichmentResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  enqueuedCount: z.number().min(0),
})

/**
 * Bulk enrichment API response schema (success or error)
 */
export const BulkEnrichmentApiResponseSchema = z.union([
  BulkEnrichmentResponseSchema,
  ApiErrorResponseSchema,
])

// Type exports
export type BulkEnrichmentRequestBody = z.infer<
  typeof BulkEnrichmentRequestBodySchema
>
export type BulkEnrichmentResponse = z.infer<
  typeof BulkEnrichmentResponseSchema
>
export type BulkEnrichmentApiResponse = z.infer<
  typeof BulkEnrichmentApiResponseSchema
>
