import { z } from 'zod'
import { ApiErrorResponseSchema } from '../../common'
import { ContactTypeEnum } from './contact'

export const CreateContactRequestSchema = z.object({
  placeId: z.string().uuid(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().optional(),
  type: ContactTypeEnum,
})

export const CreateContactResponseSchema = z.object({
  id: z.string().uuid(),
  firstName: z.string(),
  lastName: z.string().nullable(),
  type: ContactTypeEnum,
  isPrimary: z.boolean(),
})

export const CreateContactApiResponseSchema = z.union([
  CreateContactResponseSchema,
  ApiErrorResponseSchema,
])

export type CreateContactRequest = z.infer<typeof CreateContactRequestSchema>
export type CreateContactResponse = z.infer<typeof CreateContactResponseSchema>
export type CreateContactApiResponse = z.infer<
  typeof CreateContactApiResponseSchema
>
