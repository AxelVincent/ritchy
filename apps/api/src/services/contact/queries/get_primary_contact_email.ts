import { and, desc, eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { db } from '../../../db/db'
import { contactEmail } from '../../../db/schema'
import type * as schema from '../../../db/schema'

/**
 * Get primary email for a specific contact
 * @param contactId Contact ID to fetch primary email for
 * @returns Primary email or null if none exists
 */
export const getPrimaryContactEmail = async (
  contactId: string,
  tx?: PostgresJsDatabase<typeof schema>
) => {
  const dbInstance = tx || db

  const [primaryEmail] = await dbInstance
    .select()
    .from(contactEmail)
    .where(
      and(
        eq(contactEmail.contactId, contactId),
        eq(contactEmail.isPrimary, true)
      )
    )
    .orderBy(desc(contactEmail.createdAt))
    .limit(1)

  return primaryEmail
}
