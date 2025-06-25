import { and, desc, eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { db } from '../../../db/db'
import { contactSocial } from '../../../db/schema'
import type * as schema from '../../../db/schema'

/**
 * Get primary social profile for a specific contact
 * @param contactId Contact ID to fetch primary social for
 * @returns Primary social profile or null if none exists
 */
export const getPrimaryContactSocial = async (
  contactId: string,
  tx?: PostgresJsDatabase<typeof schema>,
) => {
  const dbInstance = tx || db

  const [primarySocial] = await dbInstance
    .select()
    .from(contactSocial)
    .where(
      and(
        eq(contactSocial.contactId, contactId),
        eq(contactSocial.isPrimary, true),
      ),
    )
    .orderBy(desc(contactSocial.createdAt))
    .limit(1)

  return primarySocial
}
