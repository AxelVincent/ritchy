import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { db } from '../../../db/db'
import { contactEmail } from '../../../db/schema'
import type * as schema from '../../../db/schema'
import type { Email, EmailQualityEnum, EmailResultEnum } from '../../../shared'

type EmailQualityType = (typeof EmailQualityEnum.options)[number]
type EmailResultType = (typeof EmailResultEnum.options)[number]

export const insertContactEmail = async (
  contactId: string,
  source: string,
  email: string,
  quality: EmailQualityType,
  result: EmailResultType,
  free: boolean,
  role: boolean,
  isPrimary = false,
  tx?: PostgresJsDatabase<typeof schema>,
): Promise<Email> => {
  const dbOrTx = tx ?? db

  const [contactEmailResult] = await dbOrTx
    .insert(contactEmail)
    .values({
      contact_id: contactId,
      email,
      source,
      quality,
      result,
      free,
      role,
      is_primary: isPrimary,
      is_verified: result !== null,
    })
    .onConflictDoNothing()
    .returning()

  return {
    id: contactEmailResult.id,
    email: contactEmailResult.email,
    isPrimary: contactEmailResult.is_primary,
    contactId: contactEmailResult.contact_id,
    isVerified: contactEmailResult.is_verified,
    createdAt: contactEmailResult.created_at,
    updatedAt: contactEmailResult.updated_at,
    source: contactEmailResult.source,
    quality: contactEmailResult.quality,
    result: contactEmailResult.result,
    role: contactEmailResult.role,
    free: contactEmailResult.free,
  }
}
