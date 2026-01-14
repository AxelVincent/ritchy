import { z } from 'zod'

// Request schema
export const EnrichContactRequestSchema = z.object({
  contactId: z.string().uuid(),
})

// Response schema
export const EnrichContactResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  contactId: z.string().optional(),
  credits: z.number(),
})

// Inferred types
export type EnrichContactRequest = z.infer<typeof EnrichContactRequestSchema>
export type EnrichContactResponse = z.infer<typeof EnrichContactResponseSchema>
