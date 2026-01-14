import { z } from 'zod'
import { ApiErrorResponseSchema } from '../../../shared'

// Request schema
export const AddContactEmailRequestSchema = z.object({
  contactId: z.string().uuid(),
  email: z.string().email(),
})

// Response schema (success)
export const AddContactEmailResponseSchema = z.object({
  id: z.string().uuid(),
})

// API response (success | error)
export const AddContactEmailApiResponseSchema = z.union([
  AddContactEmailResponseSchema,
  ApiErrorResponseSchema,
])

// Inferred types
export type AddContactEmailRequest = z.infer<
  typeof AddContactEmailRequestSchema
>
export type AddContactEmailResponse = z.infer<
  typeof AddContactEmailResponseSchema
>
export type AddContactEmailApiResponse = z.infer<
  typeof AddContactEmailApiResponseSchema
>
