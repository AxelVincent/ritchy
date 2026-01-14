import { z } from 'zod'
import { EnrichmentStatusDataSchema } from '../shared'

// Params schema
export const CompanyStatusParamsSchema = z.object({
  userPlaceId: z.string().uuid(),
})

// Response uses shared status schema
export const CompanyStatusResponseSchema = EnrichmentStatusDataSchema

// Inferred types
export type CompanyStatusParams = z.infer<typeof CompanyStatusParamsSchema>
export type CompanyStatusResponse = z.infer<typeof CompanyStatusResponseSchema>
