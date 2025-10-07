import { z } from 'zod'

export type EnrichmentProgressStatus =
  | 'idle'
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'

export const EnrichmentStatusDataSchema = z.object({
  status: z.enum(['idle', 'queued', 'processing', 'completed', 'failed']),
  step: z.string(),
  progress: z.number().min(0).max(100),
  updatedAt: z.number(),
  error: z.string().optional(),
  jobId: z.string().optional(),
})

export const BatchEnrichmentStatusResponseSchema = z.record(
  z.string(),
  EnrichmentStatusDataSchema,
)

// Type exports
export type EnrichmentStatusData = z.infer<typeof EnrichmentStatusDataSchema>
export type EnrichmentStatusResponse = EnrichmentStatusData
export type BatchEnrichmentStatusResponse = z.infer<
  typeof BatchEnrichmentStatusResponseSchema
>
