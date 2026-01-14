import { z } from 'zod'
import { ApiErrorResponseSchema } from '../../../shared'

// Request schema
export const DeleteContactEmailRequestSchema = z.object({
  contactId: z.string().uuid(),
})

// Response schema (success)
export const DeleteContactEmailResponseSchema = z.object({
  success: z.boolean(),
})

// API response (success | error)
export const DeleteContactEmailApiResponseSchema = z.union([
  DeleteContactEmailResponseSchema,
  ApiErrorResponseSchema,
])

// Inferred types
export type DeleteContactEmailRequest = z.infer<
  typeof DeleteContactEmailRequestSchema
>
export type DeleteContactEmailResponse = z.infer<
  typeof DeleteContactEmailResponseSchema
>
export type DeleteContactEmailApiResponse = z.infer<
  typeof DeleteContactEmailApiResponseSchema
>
