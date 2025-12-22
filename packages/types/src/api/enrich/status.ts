import { z } from 'zod'

export type EnrichmentProgressStatus =
  | 'idle'
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'

export const CreditsInfoSchema = z.object({
  creditsUsed: z.number(),
  creditsBreakdown: z.object({
    linkedin: z.number(),
    emails: z.number(),
    phones: z.number(),
  }),
})

export const EnrichmentStatusDataSchema = z.object({
  status: z.enum(['idle', 'queued', 'processing', 'completed', 'failed']),
  step: z.string(),
  progress: z.number().min(0).max(100),
  updatedAt: z.number(),
  error: z.string().optional(),
  jobId: z.string().optional(),
  /** Credit info for contact enrichment (only present on completed status) */
  credits: CreditsInfoSchema.optional(),
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
