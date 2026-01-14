import { z } from 'zod'
import { ApiErrorResponseSchema } from '../../../shared'

// Request schema
export const UpdateContactRequestSchema = z.object({
  isPrimary: z.boolean(),
})

// Response schema (success)
export const UpdateContactResponseSchema = z.object({
  success: z.boolean(),
})

// API response (success | error)
export const UpdateContactApiResponseSchema = z.union([
  UpdateContactResponseSchema,
  ApiErrorResponseSchema,
])

// Inferred types
export type UpdateContactRequest = z.infer<typeof UpdateContactRequestSchema>
export type UpdateContactResponse = z.infer<typeof UpdateContactResponseSchema>
export type UpdateContactApiResponse = z.infer<
  typeof UpdateContactApiResponseSchema
>
