import { logger } from '@ritchy/logger'
import { db } from '../../../../db/db'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { contactSocial } from '../../../../db/schema'
import { contact } from '../../../../db/schema'

export const getPrimarySocialsByPlaceIds = async (
  placeIds: string[],
  userId: string,
) => {
  if (placeIds.length === 0) {
    return new Map<string, { platform: string; profileUrl: string }>()
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

  // Process results to get one primary social per place, prioritizing LinkedIn for now
  const result = new Map<string, { platform: string; profileUrl: string }>()
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

  // For each place, prioritize LinkedIn, then take the first available
  for (const [placeId, socials] of placeGroups) {
    const linkedinSocial = socials.find(
      (social) => social.platform === 'linkedin',
    )
    if (linkedinSocial) {
      result.set(placeId, linkedinSocial)
    } else {
      result.set(placeId, socials[0])
    }
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
