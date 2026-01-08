import { z } from 'zod'

/**
 * Company enrichment data returned by the enrichment service
 * Contains all aggregated data from the enrichment process
 */
export const CompanyEnrichmentDataSchema = z.object({
  enrichmentId: z.string().uuid(),
  placeId: z.string().uuid(),

  // Website data
  domain: z.string().nullable(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  shortDescription: z.string().nullable(),
  domainRegisteredAt: z.string().datetime().nullable(),
  score: z.number().nullable(),

  // Company data (from Pappers)
  company: z
    .object({
      companyNumber: z.string(),
      name: z.string(),
      tradeName: z.string().nullable(),
      legalFormCode: z.string().nullable(),
      status: z.string(),
      dateOfCreation: z.string().datetime().nullable(),
      workforce: z.number().nullable(),
      workforceRange: z.string().nullable(),
      shareCapital: z.string().nullable(),
      confidenceScore: z.number().nullable(),
      headOffice: z
        .object({
          addressLine1: z.string().nullable(),
          addressLine2: z.string().nullable(),
          city: z.string().nullable(),
          postalCode: z.string().nullable(),
          country: z.string().nullable(),
        })
        .nullable(),
    })
    .nullable(),

  // Officers created during enrichment
  officers: z.array(
    z.object({
      id: z.string().uuid(),
      type: z.string().nullable(),
      role: z.string().nullable(),
      firstName: z.string().nullable(),
      lastName: z.string().nullable(),
      enrichmentStatus: z.string(),
    }),
  ),

  // Technologies detected
  technologies: z.array(
    z.object({
      technology: z.string(),
      category: z.string(),
      confidence: z.number(),
    }),
  ),

  // Social links
  socialLinks: z.object({
    linkedins: z.array(z.string()),
    facebooks: z.array(z.string()),
    instagrams: z.array(z.string()),
  }),

  // Company emails
  emails: z.array(
    z.object({
      email: z.string(),
      quality: z.string().nullable(),
      role: z.boolean(),
      free: z.boolean(),
    }),
  ),

  // Company phones
  phones: z.array(
    z.object({
      phone: z.string(),
      type: z.string(),
    }),
  ),

  // Credits and timing
  creditsUsed: z.number(),
  enrichedAt: z.string().datetime().nullable(),
})

export type CompanyEnrichmentData = z.infer<typeof CompanyEnrichmentDataSchema>

/**
 * Response from the company enrichment service
 */
export const CompanyEnrichmentResponseSchema = z.object({
  success: z.boolean(),
  alreadyEnriched: z.boolean(),
  data: CompanyEnrichmentDataSchema.nullable(),
})

export type CompanyEnrichmentResponse = z.infer<
  typeof CompanyEnrichmentResponseSchema
>

/**
 * WebSocket event for company enrichment completion
 * Streamed to frontend when enrichment finishes
 */
export const CompanyEnrichmentCompleteEventSchema = z.object({
  type: z.literal('enrichment:company:complete'),
  userPlaceId: z.string().uuid(),
  data: CompanyEnrichmentDataSchema,
  timestamp: z.number(),
})

export type CompanyEnrichmentCompleteEvent = z.infer<
  typeof CompanyEnrichmentCompleteEventSchema
>
