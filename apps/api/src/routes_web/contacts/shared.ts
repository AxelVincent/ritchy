import { z } from 'zod'

// Shared enums for contacts domain
export const ContactTypeEnum = z.enum(['physical', 'legal'])
export type ContactType = z.infer<typeof ContactTypeEnum>

export const GenderEnum = z.enum(['male', 'female', 'other'])
export type Gender = z.infer<typeof GenderEnum>

export const PhoneTypeEnum = z.enum([
  'MOBILE',
  'FIXED_LINE',
  'FIXED_LINE_OR_MOBILE',
  'PREMIUM_RATE',
  'TOLL_FREE',
  'SHARED_COST',
  'VOIP',
  'PERSONAL_NUMBER',
  'PAGER',
  'UAN',
  'VOICEMAIL',
])
export type PhoneType = z.infer<typeof PhoneTypeEnum>
