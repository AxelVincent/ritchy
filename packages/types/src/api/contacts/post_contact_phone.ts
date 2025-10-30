import { z } from 'zod'
import { ApiErrorResponseSchema } from '../../common'
import { PhoneTypeEnum } from '../places/places'

export const PostContactPhoneRequestSchema = z.object({
  contactId: z.string().uuid(),
  phone: z.string().min(1, 'Phone number is required'),
  type: PhoneTypeEnum,
})

export const PostContactPhoneResponseSchema = z.object({
  id: z.string().uuid(),
})

export type PostContactPhoneRequest = z.infer<
  typeof PostContactPhoneRequestSchema
>

export type PostContactPhoneResponse = z.infer<
  typeof PostContactPhoneResponseSchema
>

export const PostContactPhoneApiResponseSchema = z.union([
  PostContactPhoneResponseSchema,
  ApiErrorResponseSchema,
])

export type PostContactPhoneApiResponse = z.infer<
  typeof PostContactPhoneApiResponseSchema
>
