import { and, eq } from 'drizzle-orm'
import { db } from '../../../db/db'
import { contactSocial } from '../../../db/schema'

/**
 * Get primary social profile for a specific contact
 * @param contactId Contact ID to fetch primary social for
 * @returns Primary social profile or null if none exists
 */
export const getPrimaryContactSocial = async (contactId: string) => {
  return await db.query.contactSocial.findFirst({
    where: and(
      eq(contactSocial.contactId, contactId),
      eq(contactSocial.isPrimary, true),
    ),
  })
}
