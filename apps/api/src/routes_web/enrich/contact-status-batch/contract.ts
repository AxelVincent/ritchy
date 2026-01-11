import { z } from 'zod'
import { EnrichmentStatusDataSchema } from '../shared'

// Query schema
export const BatchContactStatusQuerySchema = z.object({
  contactIds: z
    .union([z.string().uuid(), z.array(z.string().uuid())])
    .transform((val) => (Array.isArray(val) ? val : [val]))
    .pipe(z.array(z.string().uuid()).min(1).max(100)),
})

// Response schema - map of contactId to status
export const BatchContactStatusResponseSchema = z.record(
  z.string(),
  EnrichmentStatusDataSchema,
)

// Inferred types
export type BatchContactStatusQuery = z.infer<
  typeof BatchContactStatusQuerySchema
>
export type BatchContactStatusResponse = z.infer<
  typeof BatchContactStatusResponseSchema
>
