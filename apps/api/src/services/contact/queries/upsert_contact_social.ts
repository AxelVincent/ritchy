import { eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { contactSocial } from '../../../db/schema'
import type * as schema from '../../../db/schema'

export interface InsertContactSocialData {
  contactId: string
  platform: string
  profileUrl: string
  isPrimary: boolean
  source: string
}

/**
 * Insert multiple contact social profiles within a transaction
 * @param tx Transaction instance
 * @param socials Array of social profile data to insert
 * @returns Array of inserted contact social profiles
 */
export const upsertContactSocialsWithTransaction = async (
  tx: PostgresJsDatabase<typeof schema>,
  socials: InsertContactSocialData[],
) => {
  if (socials.length === 0) {
    return []
  }

  const results = []
  for (const social of socials) {
    try {
      const [insertedSocial] = await tx
        .insert(contactSocial)
        .values(social)
        .onConflictDoUpdate({
          target: [contactSocial.contactId, contactSocial.platform],
          where: eq(contactSocial.isPrimary, true),
          set: {
            profileUrl: social.profileUrl,
            updatedAt: new Date(),
          },
        })
        .returning()
      results.push(insertedSocial)
    } catch {
      const [insertedSocial] = await tx
        .insert(contactSocial)
        .values({ ...social, isPrimary: false })
        .returning()
      results.push(insertedSocial)
    }
  }
  return results
}
