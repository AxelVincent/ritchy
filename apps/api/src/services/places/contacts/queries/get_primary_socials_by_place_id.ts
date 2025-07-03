import { logger } from '@ritchy/logger'
import type { SocialMediaPlatformEnum } from '@ritchy/types'
import { and, desc, eq, inArray } from 'drizzle-orm'
import type { z } from 'zod'
import { db } from '../../../../db/db'
import { contactSocial } from '../../../../db/schema'
import { contact } from '../../../../db/schema'

type SocialPlatform = z.infer<typeof SocialMediaPlatformEnum>

export const getPrimarySocialsByPlaceIds = async (
  placeIds: string[],
  userId: string,
  platform: SocialPlatform,
): Promise<Map<string, string | null>> => {
  if (placeIds.length === 0) {
    return new Map<string, string | null>()
  }
  const primarySocials = await db
    .select({
      placeId: contact.placeId,
      profileUrl: contactSocial.profileUrl,
    })
    .from(contactSocial)
    .innerJoin(contact, eq(contactSocial.contactId, contact.id))
    .where(
      and(
        inArray(contact.placeId, placeIds),
        eq(contact.userId, userId),
        eq(contactSocial.isPrimary, true),
        eq(contactSocial.platform, platform),
      ),
    )
    .orderBy(desc(contactSocial.createdAt))

  const result = new Map<string, string | null>()

  // Get only the first primary social per place
  for (const socialData of primarySocials) {
    if (!result.has(socialData.placeId)) {
      result.set(socialData.placeId, socialData.profileUrl)
    }
  }

  logger.info({
    msg: `Primary ${platform} socials fetched for places`,
    event: 'primary_socials_fetched',
    metadata: {
      placeIds,
      platform,
      primarySocialsCount: result.size,
      primarySocialsData: Object.fromEntries(result),
    },
  })
  return result
}
