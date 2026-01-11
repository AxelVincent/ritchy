import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { db } from '../../../db/db'
import { contactSocialMedia } from '../../../db/schema'
import type * as schema from '../../../db/schema'
import type { SocialMediaPlatform } from '../../../shared'

export const insertContactSocialMedia = async (
  contactId: string,
  url: string,
  socialMediaPlatform: SocialMediaPlatform,
  tx?: PostgresJsDatabase<typeof schema>,
) => {
  const dbOrTx = tx ?? db
  await dbOrTx
    .insert(contactSocialMedia)
    .values({
      contactId,
      url,
      socialMediaPlatform,
    })
    .onConflictDoNothing()
}
