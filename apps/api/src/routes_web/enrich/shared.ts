import { z } from 'zod'

// Shared status types for enrichment
export const EnrichmentProgressStatusEnum = z.enum([
  'idle',
  'queued',
  'processing',
  'completed',
  'failed',
])
export type EnrichmentProgressStatus = z.infer<
  typeof EnrichmentProgressStatusEnum
>

export const CreditsInfoSchema = z.object({
  creditsUsed: z.number(),
  creditsBreakdown: z.object({
    linkedin: z.number(),
    emails: z.number(),
    phones: z.number(),
  }),
})

export const EnrichmentStatusDataSchema = z.object({
  status: EnrichmentProgressStatusEnum,
  step: z.string(),
  progress: z.number().min(0).max(100),
  updatedAt: z.number(),
  error: z.string().optional(),
  jobId: z.string().optional(),
  credits: CreditsInfoSchema.optional(),
})

export type EnrichmentStatusData = z.infer<typeof EnrichmentStatusDataSchema>
export type EnrichmentStatusResponse = EnrichmentStatusData
