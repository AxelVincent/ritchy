import { logger } from '@ritchy/logger'
import type { contactSocial } from '../../db/schema'
import { getSecondarySocialsByPlaceIds } from './contacts/queries/get_secondary_socials_by_place_ids'

type SocialMediaPlatform = (typeof contactSocial.$inferInsert)['platform']

/**
 * Groups secondary social media profiles by place ID and platform
 *
 * @param placeIds - Array of place IDs to fetch secondary socials for
 * @param userId - User ID for data access control
 * @returns Promise resolving to a Map where keys are place IDs and values are Maps of platform to profile URL
 */
export const groupSecondarySocialsByPlace = async (
  placeIds: string[],
  userId: string,
): Promise<Map<string, Map<SocialMediaPlatform, string[]>>> => {
  if (placeIds.length === 0) {
    return new Map<string, Map<SocialMediaPlatform, string[]>>()
  }

  try {
    const secondarySocials = await getSecondarySocialsByPlaceIds(
      placeIds,
      userId,
    )

    // Group by place and platform using functional approach
    const result = secondarySocials.reduce((acc, socialData) => {
      const placeId = socialData.placeId
      const platform = socialData.platform as SocialMediaPlatform

      if (!acc.has(placeId)) {
        acc.set(placeId, new Map<SocialMediaPlatform, string[]>())
      }

      const placeMap = acc.get(placeId)
      if (placeMap) {
        if (!placeMap.has(platform)) {
          placeMap.set(platform, [])
        }
        const platformArray = placeMap.get(platform)
        if (platformArray) {
          platformArray.push(socialData.profileUrl)
        }
      }

      return acc
    }, new Map<string, Map<SocialMediaPlatform, string[]>>())

    logger.info({
      msg: 'Secondary socials grouped by place',
      event: 'secondary_socials_grouped',
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
  } catch (error) {
    logger.error({
      msg: 'Failed to group secondary socials by place',
      event: 'secondary_socials_group_error',
      metadata: {
        placeIds,
        userId,
        errorMessage: error instanceof Error ? error.message : String(error),
      },
    })
    throw error
  }
}
