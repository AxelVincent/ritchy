import { logger } from '@ritchy/logger'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { db } from '../../../../db/db'
import { contactSocialMedia, userPlace } from '../../../../db/schema'
import { contact } from '../../../../db/schema'

export const getSecondarySocialsByPlaceIds = async (
  userPlaceIds: string[]
): Promise<
  Array<{ placeId: string; platform: string; profileUrl: string }>
> => {
  if (userPlaceIds.length === 0) {
    return []
  }

  // get all secondary socials for the places
  const secondarySocials = await db
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

  logger.info({
    msg: 'Secondary socials fetched for places',
    event: 'secondary_socials_fetched',
    metadata: {
      userPlaceIds,
      secondarySocialsCount: secondarySocials.length,
      secondarySocialsData: secondarySocials
    }
  })

  return secondarySocials
}
