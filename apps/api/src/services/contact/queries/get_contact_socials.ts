import { desc, eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { db } from '../../../db/db'
import { contactSocial } from '../../../db/schema'
import type * as schema from '../../../db/schema'

/**
 * Get all social profiles for a specific contact
 * @param contactId Contact ID to fetch social profiles for
 * @returns Array of contact social profiles
 */
export const getContactSocials = async (
  contactId: string,
  tx?: PostgresJsDatabase<typeof schema>,
) => {
  const dbInstance = tx || db

  return await dbInstance
    .select()
    .from(contactSocial)
    .where(eq(contactSocial.contactId, contactId))
    .orderBy(desc(contactSocial.isPrimary))
}
