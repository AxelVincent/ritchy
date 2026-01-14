import { z } from 'zod'
import { ApiErrorResponseSchema, ContactTypeEnum } from '../../../shared'

// Params schema
export const GetContactsParamsSchema = z.object({
  userPlaceId: z.string(),
})

// Contact schema
export const ContactSchema = z.object({
  id: z.string(),
  userPlaceId: z.string(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  isPrimary: z.boolean(),
  type: ContactTypeEnum.nullable(),
  role: z.string().nullable(),
  mention: z.string().nullable().optional(),
  date_of_appointment: z.string().nullable(),
  last_name: z.string().nullable(),
  first_name: z.string().nullable(),
  gender: z.string().nullable(),
  date_of_birth: z.string().nullable(),
  date_of_birth_format: z.string().nullable(),
  nationality: z.string().nullable(),
  nationality_code: z.string().nullable(),
  company_name: z.string().nullable(),
  company_number: z.string().nullable(),
  address_line_1: z.string().nullable(),
  address_line_2: z.string().nullable(),
  postal_code: z.string().nullable(),
  city: z.string().nullable(),
  country: z.string().nullable(),
  country_code: z.string().nullable(),
  emails: z.array(
    z.object({
      id: z.string(),
      contactId: z.string(),
      email: z.string(),
      isPrimary: z.boolean(),
      isVerified: z.boolean(),
      source: z.string().nullable(),
      quality: z.string().nullable(),
      result: z.string().nullable(),
      role: z.boolean(),
      free: z.boolean(),
      createdAt: z.string(),
      updatedAt: z.string(),
    }),
  ),
  phones: z.array(
    z.object({
      id: z.string(),
      contactId: z.string(),
      phone: z.string(),
      type: z.string(),
      isPrimary: z.boolean(),
      createdAt: z.string(),
      updatedAt: z.string(),
    }),
  ),
  socials: z.array(
    z.object({
      id: z.string(),
      contactId: z.string(),
      platform: z.string(),
      url: z.string(),
      isPrimary: z.boolean(),
      createdAt: z.string(),
      updatedAt: z.string(),
    }),
  ),
  linkedinUrl: z.string().nullable(),
  enrichmentStatus: z
    .enum(['idle', 'queued', 'processing', 'completed', 'failed'])
    .default('idle'),
  enrichedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

// Response schema (success)
export const GetContactsResponseSchema = z.object({
  contacts: z.array(ContactSchema),
})

// API response (success | error)
export const GetContactsApiResponseSchema = z.union([
  GetContactsResponseSchema,
  ApiErrorResponseSchema,
])

// Inferred types
export type GetContactsParams = z.infer<typeof GetContactsParamsSchema>
export type Contact = z.infer<typeof ContactSchema>
export type GetContactsResponse = z.infer<typeof GetContactsResponseSchema>
export type GetContactsApiResponse = z.infer<
  typeof GetContactsApiResponseSchema
>
