import { z } from 'zod'
import { EnrichmentStatusDataSchema } from '../shared'

// Params schema
export const ContactStatusParamsSchema = z.object({
  contactId: z.string().uuid(),
})

// Response uses shared status schema
export const ContactStatusResponseSchema = EnrichmentStatusDataSchema

// Inferred types
export type ContactStatusParams = z.infer<typeof ContactStatusParamsSchema>
export type ContactStatusResponse = z.infer<typeof ContactStatusResponseSchema>
