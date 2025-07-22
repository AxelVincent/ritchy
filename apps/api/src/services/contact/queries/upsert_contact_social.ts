import { and, eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { contactSocialMedia } from '../../../db/schema'
import type * as schema from '../../../db/schema'

type SocialMediaPlatform =
  (typeof contactSocialMedia.$inferInsert)['socialMediaPlatform']

export interface InsertContactSocialData {
  contactId: string
  platform: SocialMediaPlatform
  profileUrl: string
  isPrimary: boolean
}

/**
 * Insert multiple contact social profiles within a transaction
 * @param tx Transaction instance
 * @param socials Array of social profile data to insert
 * @returns Array of inserted contact social profiles
 */
export const upsertContactSocialsWithTransaction = async (
  tx: PostgresJsDatabase<typeof schema>,
  socials: InsertContactSocialData[]
) => {
  if (socials.length === 0) {
    return []
  }

  const results = []
  for (const social of socials) {
    // Check if a primary social already exists for this contact+platform
    const existingPrimary = await tx
      .select()
      .from(contactSocialMedia)
      .where(
        and(
          eq(contactSocialMedia.contactId, social.contactId),
          eq(contactSocialMedia.socialMediaPlatform, social.platform),
          eq(contactSocialMedia.isPrimary, true)
        )
      )
      .limit(1)

    // Make secondary if primary already exists
    const isPrimary = social.isPrimary && existingPrimary.length === 0

    // Check if this exact social already exists
    const existingSocial = await tx
      .select()
      .from(contactSocialMedia)
      .where(
        and(
          eq(contactSocialMedia.contactId, social.contactId),
          eq(contactSocialMedia.socialMediaPlatform, social.platform),
          eq(contactSocialMedia.url, social.profileUrl)
        )
      )
      .limit(1)

    if (existingSocial.length > 0) {
      // Update existing social
      const [updatedSocial] = await tx
        .update(contactSocialMedia)
        .set({
          url: social.profileUrl,
          updatedAt: new Date()
        })
        .where(eq(contactSocialMedia.id, existingSocial[0].id))
        .returning()
      results.push(updatedSocial)
    } else {
      // Insert new social
      const [insertedSocial] = await tx
        .insert(contactSocialMedia)
        .values({
          contactId: social.contactId,
          socialMediaPlatform: social.platform,
          isPrimary,
          url: social.profileUrl
        })
        .returning()
      results.push(insertedSocial)
    }
  }
  return results
}
