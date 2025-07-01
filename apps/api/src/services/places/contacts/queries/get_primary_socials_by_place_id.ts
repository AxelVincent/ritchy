import { logger } from '@ritchy/logger'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { db } from '../../../../db/db'
import { contactSocial } from '../../../../db/schema'
import { contact } from '../../../../db/schema'

export const getPrimarySocialsByPlaceIds = async (
  placeIds: string[],
  userId: string,
): Promise<Map<string, { platform: string; profileUrl: string }[]>> => {
  if (placeIds.length === 0) {
    return new Map<string, { platform: string; profileUrl: string }[]>()
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

  const result = new Map<string, { platform: string; profileUrl: string }[]>()
  const placeGroups = new Map<
    string,
    Array<{ platform: string; profileUrl: string }>
  >()

  // Group primary socials by place
  for (const socialData of primarySocials) {
    if (!placeGroups.has(socialData.placeId)) {
      placeGroups.set(socialData.placeId, [])
    }
    const placeGroup = placeGroups.get(socialData.placeId)
    if (placeGroup) {
      placeGroup.push({
        platform: socialData.platform,
        profileUrl: socialData.profileUrl,
      })
    }
  }

  for (const [placeId, socials] of placeGroups) {
    // Return all primary socials for each place
    result.set(placeId, socials)
  }

  logger.info({
    msg: 'Primary socials fetched for places',
    event: 'primary_socials_fetched',
    metadata: {
      placeIds,
      primarySocialsCount: result.size,
      primarySocialsData: Object.fromEntries(result),
    },
  })
  return result
}
