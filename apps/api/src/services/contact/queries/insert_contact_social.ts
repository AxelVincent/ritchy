import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { db } from '../../../db/db'
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
export const insertContactSocialsWithTransaction = async (
  tx: PostgresJsDatabase<typeof schema>,
  socials: InsertContactSocialData[],
) => {
  if (socials.length === 0) {
    return []
  }

  const insertedSocials = await tx
    .insert(contactSocial)
    .values(socials)
    .returning()

  return insertedSocials
}
