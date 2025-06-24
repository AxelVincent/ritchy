import { and, eq } from 'drizzle-orm'
import { db } from '../../../db/db'
import { contactEmail } from '../../../db/schema'

/**
 * Get all emails for a specific contact
 * @param contactId Contact ID to fetch emails for
 * @returns Array of contact emails
 */
export const get_contact_emails = async (contactId: string) => {
  return await db.query.contactEmail.findMany({
    where: eq(contactEmail.contactId, contactId),
    orderBy: (contactEmail, { desc }) => [desc(contactEmail.isPrimary)],
  })
}

/**
 * Get primary email for a specific contact
 * @param contactId Contact ID to fetch primary email for
 * @returns Primary email or null if none exists
 */
export const get_primary_contact_email = async (contactId: string) => {
  return await db.query.contactEmail.findFirst({
    where: and(
      eq(contactEmail.contactId, contactId),
      eq(contactEmail.isPrimary, true),
    ),
  })
}
