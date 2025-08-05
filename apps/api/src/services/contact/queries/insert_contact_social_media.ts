import type { SocialMediaPlatform } from '@ritchy/types'
import { db } from '../../../db/db'
import { contactSocialMedia } from '../../../db/schema'

export const insertContactSocialMedia = async (
  contactId: string,
  url: string,
  socialMediaPlatform: SocialMediaPlatform,
) => {
  await db
    .insert(contactSocialMedia)
    .values({
      contactId,
      url,
      socialMediaPlatform,
    })
    .onConflictDoNothing()
}
