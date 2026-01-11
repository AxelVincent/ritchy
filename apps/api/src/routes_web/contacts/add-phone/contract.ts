import { z } from 'zod'
import { ApiErrorResponseSchema } from '../../../shared'
import { PhoneTypeEnum } from '../shared'

// Request schema
export const AddContactPhoneRequestSchema = z.object({
  contactId: z.string().uuid(),
  phone: z.string().min(1, 'Phone number is required'),
  type: PhoneTypeEnum,
})

// Response schema (success)
export const AddContactPhoneResponseSchema = z.object({
  id: z.string().uuid(),
})

// API response (success | error)
export const AddContactPhoneApiResponseSchema = z.union([
  AddContactPhoneResponseSchema,
  ApiErrorResponseSchema,
])

// Inferred types
export type AddContactPhoneRequest = z.infer<
  typeof AddContactPhoneRequestSchema
>
export type AddContactPhoneResponse = z.infer<
  typeof AddContactPhoneResponseSchema
>
export type AddContactPhoneApiResponse = z.infer<
  typeof AddContactPhoneApiResponseSchema
>
