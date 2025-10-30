import { z } from 'zod'
import { EmailSchema } from '../places'
export const ContactSocialSchema = z.object({
  id: z.string(),
  contactId: z.string(),
  platform: z.string(),
  profileUrl: z.string(),
  isPrimary: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const ContactSchema = z.object({
  id: z.string(),
  placeId: z.string(),
  userId: z.string(),
  firstname: z.string().nullable(),
  lastname: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  emails: z.array(EmailSchema),
  socials: z.array(ContactSocialSchema),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type Contact = z.infer<typeof ContactSchema>
export type ContactSocial = z.infer<typeof ContactSocialSchema>
