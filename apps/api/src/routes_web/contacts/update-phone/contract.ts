import { z } from 'zod'
import { ApiErrorResponseSchema } from '../../../shared'

// Request schema
export const UpdateContactPhoneRequestSchema = z.object({
  contactId: z.string().uuid(),
  isPrimary: z.boolean().optional(),
})

// Response schema (success)
export const UpdateContactPhoneResponseSchema = z.object({
  success: z.boolean(),
})

// API response (success | error)
export const UpdateContactPhoneApiResponseSchema = z.union([
  UpdateContactPhoneResponseSchema,
  ApiErrorResponseSchema,
])

// Inferred types
export type UpdateContactPhoneRequest = z.infer<
  typeof UpdateContactPhoneRequestSchema
>
export type UpdateContactPhoneResponse = z.infer<
  typeof UpdateContactPhoneResponseSchema
>
export type UpdateContactPhoneApiResponse = z.infer<
  typeof UpdateContactPhoneApiResponseSchema
>
