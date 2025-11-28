import { logger } from '@ritchy/logger'
import { enqueueContactoutPeopleSearchJob } from '../../../../../../internal/bullmq/jobs/contactout/people_search/queue'
import {
  type ProviderError,
  type Result,
  createNoResultsError,
} from '../../../../types/error_handling'
import type { ValidatedOfficerData } from '../../../../utils/validate_officer'
import type { LinkedInResult } from '../index'

export const enrichWithContactOut = async (
  validated: ValidatedOfficerData,
): Promise<Result<LinkedInResult, ProviderError>> => {
  logger.debug({
    msg: '[linkedin_waterfall] Starting ContactOut search',
    event: 'contactout_search_start',
    metadata: {
      officerId: validated.id,
      fullName: validated.fullName,
    },
  })

  const contactoutResult = await enqueueContactoutPeopleSearchJob({
    name: validated.fullName,
    revealInfo: false,
    page: 1,
  })

  if (
    contactoutResult.status_code === 200 &&
    contactoutResult.profiles &&
    Object.keys(contactoutResult.profiles).length > 0
  ) {
    const linkedinUrls = Object.keys(contactoutResult.profiles).filter((url) =>
      url.includes('linkedin.com'),
    )

    if (linkedinUrls.length > 0) {
      logger.info({
        msg: '[linkedin_waterfall] LinkedIn found via ContactOut',
        event: 'linkedin_found_contactout',
        metadata: {
          officerId: validated.id,
          profileCount: linkedinUrls.length,
          profileUrl: linkedinUrls[0],
          totalResults: contactoutResult.metadata.total_results,
        },
      })

      return {
        success: true,
        data: {
          profileUrl: linkedinUrls[0],
          confidence: 50, // Lower confidence for ContactOut without LLM matching
          reasoning: 'Found via ContactOut People Search (waterfall fallback)',
          source: 'contactout',
        },
      }
    }

    logger.info({
      msg: '[linkedin_waterfall] ContactOut found profiles but no LinkedIn URLs',
      event: 'contactout_no_linkedin',
      metadata: {
        officerId: validated.id,
        profilesFound: Object.keys(contactoutResult.profiles).length,
      },
    })
  } else {
    logger.info({
      msg: '[linkedin_waterfall] No profiles found via ContactOut',
      event: 'contactout_no_profiles',
      metadata: {
        officerId: validated.id,
        statusCode: contactoutResult.status_code,
      },
    })
  }

  return {
    success: false,
    error: createNoResultsError('contactout_people_search', {
      officerId: validated.id,
      statusCode: contactoutResult.status_code,
    }),
  }
}
