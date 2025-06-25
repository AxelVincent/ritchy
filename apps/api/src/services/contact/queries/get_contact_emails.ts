import { desc, eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { db } from '../../../db/db'
import { contactEmail } from '../../../db/schema'
import type * as schema from '../../../db/schema'

/**
 * Get all emails for a specific contact
 * @param contactId Contact ID to fetch emails for
 * @returns Array of contact emails
 */
export const getContactEmails = async (
  contactId: string,
  tx?: PostgresJsDatabase<typeof schema>,
) => {
  const dbInstance = tx || db

  return await dbInstance
    .select()
    .from(contactEmail)
    .where(eq(contactEmail.contactId, contactId))
    .orderBy(desc(contactEmail.isPrimary))
}
