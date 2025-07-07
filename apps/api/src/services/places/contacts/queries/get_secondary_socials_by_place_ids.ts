import { logger } from '@ritchy/logger'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { db } from '../../../../db/db'
import { contactSocial } from '../../../../db/schema'
import { contact } from '../../../../db/schema'

export const getSecondarySocialsByPlaceIds = async (
  placeIds: string[],
  userId: string,
): Promise<
  Array<{ placeId: string; platform: string; profileUrl: string }>
> => {
  if (placeIds.length === 0) {
    return []
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

  logger.info({
    msg: 'Secondary socials fetched for places',
    event: 'secondary_socials_fetched',
    metadata: {
      placeIds,
      secondarySocialsCount: secondarySocials.length,
      secondarySocialsData: secondarySocials,
    },
  })

  return secondarySocials
}
