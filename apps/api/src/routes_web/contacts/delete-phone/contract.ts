import { z } from 'zod'
import { ApiErrorResponseSchema } from '../../../shared'

// Request schema
export const DeleteContactPhoneRequestSchema = z.object({
  contactId: z.string().uuid(),
})

// Response schema (success)
export const DeleteContactPhoneResponseSchema = z.object({
  success: z.boolean(),
})

// API response (success | error)
export const DeleteContactPhoneApiResponseSchema = z.union([
  DeleteContactPhoneResponseSchema,
  ApiErrorResponseSchema,
])

// Inferred types
export type DeleteContactPhoneRequest = z.infer<
  typeof DeleteContactPhoneRequestSchema
>
export type DeleteContactPhoneResponse = z.infer<
  typeof DeleteContactPhoneResponseSchema
>
export type DeleteContactPhoneApiResponse = z.infer<
  typeof DeleteContactPhoneApiResponseSchema
>
