import { logger } from '@ritchy/logger'
import { db } from '../../../../db/db'
import {
  enrichmentFacebook,
  enrichmentInstagram,
  enrichmentLinkedin,
} from '../../../../db/schema'
import { isSocialMediaUrl } from './is_social_media_url'

export const processSocialMediaDomain = async ({
  enrichmentId,
  website,
}: {
  enrichmentId: string
  website: string
}) => {
  logger.info({
    msg: 'Processing social media url',
    event: 'processing_social_media_url',
    metadata: { website },
  })
  if (!isSocialMediaUrl(website)) {
    logger.info({
      msg: 'Website is not a social media url',
      event: 'website_is_not_social_media_url',
      metadata: { website },
    })
    return
  }

  try {
    if (website.includes('linkedin.com')) {
      await db.insert(enrichmentLinkedin).values({
        enrichmentId,
        url: website,
      })
      logger.info({
        msg: 'Website is a LinkedIn url',
        event: 'website_is_linkedin_url',
        metadata: { website },
      })
    }

    if (website.includes('facebook.com')) {
      await db.insert(enrichmentFacebook).values({
        enrichmentId,
        url: website,
      })
      logger.info({
        msg: 'Website is a Facebook url',
        event: 'website_is_facebook_url',
        metadata: { website },
      })
    }

    if (website.includes('instagram.com')) {
      await db.insert(enrichmentInstagram).values({
        enrichmentId,
        url: website,
      })
      logger.info({
        msg: 'Website is an Instagram url',
        event: 'website_is_instagram_url',
        metadata: { website },
      })
    }
    return
  } catch (error) {
    logger.error({
      msg: 'Error processing social media url',
      event: 'error_processing_social_media_url',
      metadata: { website, error },
    })
    return
  }
}
