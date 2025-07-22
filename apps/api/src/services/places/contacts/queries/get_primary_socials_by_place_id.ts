import { logger } from '@ritchy/logger'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { db } from '../../../../db/db'
import { contactSocialMedia, userPlace } from '../../../../db/schema'
import { contact } from '../../../../db/schema'

type SocialMediaPlatform =
  (typeof contactSocialMedia.$inferInsert)['socialMediaPlatform']

export const getPrimarySocialsByPlaceIds = async (
  userPlaceIds: string[]
): Promise<Map<string, Map<SocialMediaPlatform, string | null>>> => {
  if (userPlaceIds.length === 0) {
    return new Map<string, Map<SocialMediaPlatform, string | null>>()
  }

  const primarySocials = await db
    .select({
      placeId: userPlace.placeId,
      platform: contactSocialMedia.socialMediaPlatform,
      profileUrl: contactSocialMedia.url
    })
    .from(contactSocialMedia)
    .innerJoin(contact, eq(contactSocialMedia.contactId, contact.id))
    .innerJoin(userPlace, eq(contact.userPlaceId, userPlace.id))
    .where(inArray(userPlace.id, userPlaceIds))
    .orderBy(desc(contactSocialMedia.createdAt))

  const result = new Map<string, Map<SocialMediaPlatform, string | null>>()

  // Initialize maps for each place
  for (const userPlaceId of userPlaceIds) {
    result.set(userPlaceId, new Map<SocialMediaPlatform, string | null>())
  }

  // Group by place and platform
  for (const socialData of primarySocials) {
    const placeId = socialData.placeId
    const platform = socialData.platform as SocialMediaPlatform
    const placeMap = result.get(placeId)

    if (placeMap && !placeMap.has(platform)) {
      placeMap.set(platform, socialData.profileUrl)
    }
  }

  logger.info({
    msg: 'Primary socials fetched for places',
    event: 'primary_socials_fetched',
    metadata: {
      userPlaceIds,
      placesCount: result.size,
      totalPrimarySocials: Array.from(result.values()).reduce(
        (sum, map) => sum + map.size,
        0
      )
    }
  })

  return result
}
