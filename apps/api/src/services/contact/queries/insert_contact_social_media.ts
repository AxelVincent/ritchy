import { logger } from '@ritchy/logger'
import type { SocialMediaPlatform } from '@ritchy/types'
import { and, eq } from 'drizzle-orm'
import { db } from '../../../db/db'
import { contactSocialMedia } from '../../../db/schema'

export const insertContactSocialMedia = async (
  contactId: string,
  url: string,
  socialMediaPlatform: SocialMediaPlatform,
) => {
  logger.info({
    msg: 'Inserting social media',
    event: 'inserting_social_media',
    metadata: { contactId, url, socialMediaPlatform },
  })
  const [existingSocialMedia] = await db
    .select()
    .from(contactSocialMedia)
    .where(
      and(
        eq(contactSocialMedia.contactId, contactId),
        eq(contactSocialMedia.url, url),
      ),
    )
    .limit(1)

  logger.info({
    msg: 'Existing social media',
    event: 'existing_social_media',
    metadata: { existingSocialMedia },
  })

  if (existingSocialMedia) {
    logger.info({
      msg: 'Social media already exists',
      event: 'social_media_already_exists',
      metadata: { url, socialMediaPlatform },
    })
    return
  }

  await db.insert(contactSocialMedia).values({
    contactId,
    url,
    socialMediaPlatform,
  })
  logger.info({
    msg: 'Contact social media inserted',
    event: 'contact_social_media_inserted',
    metadata: { contactId, url, socialMediaPlatform },
  })
}
