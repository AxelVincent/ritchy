import { z } from 'zod'
import { ApiErrorResponseSchema } from '../../../shared'

// Response schema (success)
export const CreatePortalSessionResponseSchema = z.object({
  url: z.string(),
})

// API response (success | error)
export const CreatePortalSessionApiResponseSchema = z.union([
  CreatePortalSessionResponseSchema,
  ApiErrorResponseSchema,
])

// Inferred types
export type CreatePortalSessionResponse = z.infer<
  typeof CreatePortalSessionResponseSchema
>
export type CreatePortalSessionApiResponse = z.infer<
  typeof CreatePortalSessionApiResponseSchema
>
