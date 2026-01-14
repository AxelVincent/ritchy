import { z } from 'zod'
import { ApiErrorResponseSchema } from '../../../shared'

// Request schema
export const DeleteContactRequestSchema = z.object({
  placeId: z.string().uuid(),
})

// Params schema
export const DeleteContactParamsSchema = z.object({
  contactId: z.string().uuid(),
})

// Response schema (success)
export const DeleteContactResponseSchema = z.object({
  success: z.boolean(),
  contactId: z.string().uuid(),
})

// API response (success | error)
export const DeleteContactApiResponseSchema = z.union([
  DeleteContactResponseSchema,
  ApiErrorResponseSchema,
])

// Inferred types
export type DeleteContactRequest = z.infer<typeof DeleteContactRequestSchema>
export type DeleteContactParams = z.infer<typeof DeleteContactParamsSchema>
export type DeleteContactResponse = z.infer<typeof DeleteContactResponseSchema>
export type DeleteContactApiResponse = z.infer<
  typeof DeleteContactApiResponseSchema
>
