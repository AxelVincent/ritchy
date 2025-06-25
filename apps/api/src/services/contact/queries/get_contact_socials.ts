import { eq } from 'drizzle-orm'
import { db } from '../../../db/db'
import { contactSocial } from '../../../db/schema'

/**
 * Get all social profiles for a specific contact
 * @param contactId Contact ID to fetch social profiles for
 * @returns Array of contact social profiles
 */
export const getContactSocials = async (contactId: string) => {
  return await db.query.contactSocial.findMany({
    where: eq(contactSocial.contactId, contactId),
    orderBy: (contactSocial, { desc }) => [desc(contactSocial.isPrimary)],
  })
}
