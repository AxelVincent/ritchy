import { z } from 'zod'
import { ApiErrorResponseSchema } from '../../../shared'

// Request schema
export const UpdateContactEmailRequestSchema = z.object({
  contactId: z.string().uuid(),
  isPrimary: z.boolean().optional(),
})

// Response schema (success)
export const UpdateContactEmailResponseSchema = z.object({
  success: z.boolean(),
})

// API response (success | error)
export const UpdateContactEmailApiResponseSchema = z.union([
  UpdateContactEmailResponseSchema,
  ApiErrorResponseSchema,
])

// Inferred types
export type UpdateContactEmailRequest = z.infer<
  typeof UpdateContactEmailRequestSchema
>
export type UpdateContactEmailResponse = z.infer<
  typeof UpdateContactEmailResponseSchema
>
export type UpdateContactEmailApiResponse = z.infer<
  typeof UpdateContactEmailApiResponseSchema
>
