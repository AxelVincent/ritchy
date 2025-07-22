import { and, desc, eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { db } from '../../../db/db'
import { contactSocialMedia } from '../../../db/schema'
import type * as schema from '../../../db/schema'

/**
 * Get primary social profiles for a specific contact
 * @param contactId Contact ID to fetch primary social profiles
 * @returns Primary social profiles List or empty list if none exists
 */
export const getPrimaryContactSocialsByContact = async (
  contactId: string,
  tx?: PostgresJsDatabase<typeof schema>
) => {
  const dbInstance = tx || db

  const primarySocials = await dbInstance
    .select()
    .from(contactSocialMedia)
    .where(
      and(
        eq(contactSocialMedia.contactId, contactId),
        eq(contactSocialMedia.isPrimary, true)
      )
    )
    .orderBy(desc(contactSocialMedia.createdAt))

  return primarySocials
}
