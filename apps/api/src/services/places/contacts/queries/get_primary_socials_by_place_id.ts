import { logger } from '@ritchy/logger'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { db } from '../../../../db/db'
import { contactSocial } from '../../../../db/schema'
import { contact } from '../../../../db/schema'

type SocialPlatform =
  | 'linkedin'
  | 'twitter'
  | 'facebook'
  | 'instagram'
  | 'youtube'
  | 'tiktok'
  | 'pinterest'
  | 'reddit'
  | 'snapchat'

export const getPrimarySocialsByPlaceIds = async (
  placeIds: string[],
  userId: string,
): Promise<Map<string, Map<SocialPlatform, string | null>>> => {
  if (placeIds.length === 0) {
    return new Map<string, Map<SocialPlatform, string | null>>()
  }

  const primarySocials = await db
    .select({
      placeId: contact.placeId,
      platform: contactSocial.platform,
      profileUrl: contactSocial.profileUrl,
    })
    .from(contactSocial)
    .innerJoin(contact, eq(contactSocial.contactId, contact.id))
    .where(
      and(
        inArray(contact.placeId, placeIds),
        eq(contact.userId, userId),
        eq(contactSocial.isPrimary, true),
      ),
    )
    .orderBy(desc(contactSocial.createdAt))

  const result = new Map<string, Map<SocialPlatform, string | null>>()

  // Initialize maps for each place
  for (const placeId of placeIds) {
    result.set(placeId, new Map<SocialPlatform, string | null>())
  }

  // Group by place and platform
  for (const socialData of primarySocials) {
    const placeId = socialData.placeId
    const platform = socialData.platform as SocialPlatform
    const placeMap = result.get(placeId)

    if (placeMap && !placeMap.has(platform)) {
      placeMap.set(platform, socialData.profileUrl)
    }
  }

  logger.info({
    msg: 'Primary socials fetched for places',
    event: 'primary_socials_fetched',
    metadata: {
      placeIds,
      placesCount: result.size,
      totalPrimarySocials: Array.from(result.values()).reduce(
        (sum, map) => sum + map.size,
        0,
      ),
    },
  })

  return result
}
