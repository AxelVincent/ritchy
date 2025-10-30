import { z } from 'zod'

export const ContactTypeEnum = z.enum(['physical', 'legal'])
export const GenderEnum = z.enum(['male', 'female', 'other'])

export type ContactType = z.infer<typeof ContactTypeEnum>
