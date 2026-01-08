import { z } from 'zod'

/**
 * Contact enrichment data returned by the enrichment service
 * Contains LinkedIn, emails, and phones for a company officer
 */
export const ContactEnrichmentDataSchema = z.object({
  contactId: z.string().uuid(),
  officerId: z.string().uuid(),

  // LinkedIn profile found
  linkedin: z
    .object({
      profileUrl: z.string(),
      confidence: z.number(),
      reasoning: z.string().nullable(),
      source: z.string(),
    })
    .nullable(),

  // Emails found and verified
  emails: z.array(
    z.object({
      email: z.string(),
      isVerified: z.boolean(),
      quality: z.string().nullable(),
      role: z.boolean(),
      free: z.boolean(),
      source: z.string().nullable(),
    }),
  ),

  // Phone numbers found
  phones: z.array(
    z.object({
      phone: z.string(),
      source: z.string(),
    }),
  ),

  // Credits breakdown
  credits: z.object({
    used: z.number(),
    breakdown: z.object({
      linkedin: z.number(),
      emails: z.number(),
      phones: z.number(),
    }),
  }),

  enrichedAt: z.string().datetime().nullable(),
})

export type ContactEnrichmentData = z.infer<typeof ContactEnrichmentDataSchema>

/**
 * Response from the contact enrichment service
 */
export const ContactEnrichmentResponseSchema = z.object({
  success: z.boolean(),
  alreadyEnriched: z.boolean(),
  data: ContactEnrichmentDataSchema.nullable(),
})

export type ContactEnrichmentResponse = z.infer<
  typeof ContactEnrichmentResponseSchema
>

/**
 * WebSocket event for contact enrichment completion
 * Streamed to frontend when a contact finishes enriching
 */
export const ContactEnrichmentCompleteEventSchema = z.object({
  type: z.literal('enrichment:contact:complete'),
  userPlaceId: z.string().uuid(),
  officerId: z.string().uuid(),
  data: ContactEnrichmentDataSchema,
  timestamp: z.number(),
})

export type ContactEnrichmentCompleteEvent = z.infer<
  typeof ContactEnrichmentCompleteEventSchema
>
