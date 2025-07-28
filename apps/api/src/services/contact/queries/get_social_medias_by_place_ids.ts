import type { SocialMedia } from '@ritchy/types'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { db } from '../../../db/db'
import { contact, contactSocialMedia } from '../../../db/schema'

type SocialMediaPlatform =
  (typeof contactSocialMedia.$inferInsert)['socialMediaPlatform']

export const getSocialMediasByPlaceIds = async (
  userPlaceIds: string[],
  platform: SocialMediaPlatform,
) => {
  if (userPlaceIds.length === 0) {
    return new Map<string, SocialMedia[]>()
  }

  const socialMedias = await db
    .select({
      userPlaceId: contact.userPlaceId,
      url: contactSocialMedia.url,
      platform: contactSocialMedia.socialMediaPlatform,
      isPrimary: contactSocialMedia.isPrimary,
      createdAt: contactSocialMedia.createdAt,
      updatedAt: contactSocialMedia.updatedAt,
    })
    .from(contactSocialMedia)
    .innerJoin(contact, eq(contactSocialMedia.contactId, contact.id))
    .where(
      and(
        inArray(contact.userPlaceId, userPlaceIds),
        eq(contactSocialMedia.socialMediaPlatform, platform),
      ),
    )
    .orderBy(desc(contactSocialMedia.isPrimary))

  const result = new Map<string, SocialMedia[]>()
  for (const socialMedia of socialMedias) {
    result.set(socialMedia.userPlaceId, [
      ...(result.get(socialMedia.userPlaceId) || []),
      socialMedia,
    ])
  }

  return result
}
