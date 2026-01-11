import { z } from 'zod'
import { EnrichmentStatusDataSchema } from '../shared'

// Query schema
export const BatchStatusQuerySchema = z.object({
  userPlaceIds: z
    .union([z.string().uuid(), z.array(z.string().uuid())])
    .transform((val) => (Array.isArray(val) ? val : [val]))
    .pipe(z.array(z.string().uuid()).min(1).max(500)),
})

// Response schema - map of userPlaceId to status
export const BatchStatusResponseSchema = z.record(
  z.string(),
  EnrichmentStatusDataSchema,
)

// Inferred types
export type BatchStatusQuery = z.infer<typeof BatchStatusQuerySchema>
export type BatchStatusResponse = z.infer<typeof BatchStatusResponseSchema>
