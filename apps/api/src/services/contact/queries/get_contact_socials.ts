import { and, eq } from 'drizzle-orm'
import { db } from '../../../db/db'
import { contactSocial } from '../../../db/schema'

/**
 * Get all social profiles for a specific contact
 * @param contactId Contact ID to fetch social profiles for
 * @returns Array of contact social profiles
 */
export const get_contact_socials = async (contactId: string) => {
  return await db.query.contactSocial.findMany({
    where: eq(contactSocial.contactId, contactId),
    orderBy: (contactSocial, { desc }) => [desc(contactSocial.isPrimary)],
  })
}

/**
 * Get primary social profile for a specific contact
 * @param contactId Contact ID to fetch primary social for
 * @returns Primary social profile or null if none exists
 */
export const get_primary_contact_social = async (contactId: string) => {
  return await db.query.contactSocial.findFirst({
    where: and(
      eq(contactSocial.contactId, contactId),
      eq(contactSocial.isPrimary, true),
    ),
  })
}

/**
 * Check if a specific social profile URL already exists for a contact
 * @param contactId Contact ID to check
 * @param profileUrl Social profile URL to check
 * @returns True if social profile exists, false otherwise
 */
export const social_exists_for_contact = async (
  contactId: string,
  profileUrl: string,
): Promise<boolean> => {
  const existingSocial = await db.query.contactSocial.findFirst({
    where: and(
      eq(contactSocial.contactId, contactId),
      eq(contactSocial.profileUrl, profileUrl),
    ),
  })

  return !!existingSocial
}
