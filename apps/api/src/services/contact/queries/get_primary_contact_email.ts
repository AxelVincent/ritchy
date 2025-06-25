import { and, eq } from 'drizzle-orm'
import { db } from '../../../db/db'
import { contactEmail } from '../../../db/schema'

/**
 * Get primary email for a specific contact
 * @param contactId Contact ID to fetch primary email for
 * @returns Primary email or null if none exists
 */
export const getPrimaryContactEmail = async (contactId: string) => {
  return await db.query.contactEmail.findFirst({
    where: and(
      eq(contactEmail.contactId, contactId),
      eq(contactEmail.isPrimary, true),
    ),
  })
}
