import { z } from 'zod'

// Request schema
export const EnrichCompanyRequestSchema = z.object({
  userPlaceId: z.string().uuid(),
})

// Response schema
export const EnrichCompanyResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  enrichmentId: z.string().optional(),
  credits: z.number(),
})

// Inferred types
export type EnrichCompanyRequest = z.infer<typeof EnrichCompanyRequestSchema>
export type EnrichCompanyResponse = z.infer<typeof EnrichCompanyResponseSchema>
