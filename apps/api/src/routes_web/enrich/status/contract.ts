import { z } from 'zod'
import { EnrichmentStatusDataSchema } from '../shared'

// Params schema
export const StatusParamsSchema = z.object({
  userPlaceId: z.string().uuid(),
})

// Response uses shared status schema
export const StatusResponseSchema = EnrichmentStatusDataSchema

// Inferred types
export type StatusParams = z.infer<typeof StatusParamsSchema>
export type StatusResponse = z.infer<typeof StatusResponseSchema>
