import { logger } from '@ritchy/logger'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { db } from '../../../../db/db'
import { contactSocial } from '../../../../db/schema'
import { contact } from '../../../../db/schema'

type SocialMediaPlatform = (typeof contactSocial.$inferInsert)['platform']

export const getSecondarySocialsByPlaceIds = async (
  placeIds: string[],
  userId: string,
): Promise<Map<string, Map<SocialMediaPlatform, string | null>>> => {
  if (placeIds.length === 0) {
    return new Map<string, Map<SocialMediaPlatform, string | null>>()
  }

  // get all secondary socials for the places
  const secondarySocials = await db
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
        eq(contactSocial.isPrimary, false),
      ),
    )
    .orderBy(desc(contactSocial.createdAt))

  // initialize the result map
  const result = new Map<string, Map<SocialMediaPlatform, string | null>>()

  for (const placeId of placeIds) {
    result.set(placeId, new Map<SocialMediaPlatform, string | null>())
  }

  // group by place and platform
  for (const socialData of secondarySocials) {
    const placeId = socialData.placeId
    const platform = socialData.platform as SocialMediaPlatform
    const placeMap = result.get(placeId)

    if (placeMap && !placeMap.has(platform)) {
      placeMap.set(platform, socialData.profileUrl)
    }
  }

  logger.info({
    msg: 'Secondary socials fetched for places',
    event: 'secondary_socials_fetched',
    metadata: {
      placeIds,
      placesCount: result.size,
      totalSecondarySocials: Array.from(result.values()).reduce(
        (sum, map) => sum + map.size,
        0,
      ),
    },
  })
  return result
}
