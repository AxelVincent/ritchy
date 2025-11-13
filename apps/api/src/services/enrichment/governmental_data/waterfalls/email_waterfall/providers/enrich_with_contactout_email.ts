import { logger } from '@ritchy/logger'
import { enqueueContactoutPeopleSearchJob } from '../../../../../../internal/bullmq/jobs/contactout/people_search/queue'
import type { InsertOfficerEmailData } from '../../../../queries/insert_enrichment_company_officer_emails'
import {
  type ProviderError,
  type Result,
  createAuthenticationError,
  createNoResultsError,
  createRateLimitError,
  createTimeoutError,
} from '../../../../types/error_handling'

/**
 * Provider function for ContactOut email search
 * Returns Result<T, ProviderError> for consistent error handling
 */
export const enrichWithContactOutEmail = async (
  officerId: string,
  firstName: string,
  lastName: string,
): Promise<Result<InsertOfficerEmailData[], ProviderError>> => {
  const fullName = `${firstName} ${lastName}`.trim()

  try {
    const contactoutResult = await enqueueContactoutPeopleSearchJob({
      name: fullName,
      revealInfo: true, // Need to reveal info to get emails
      page: 1,
    })

    // Check response status
    if (contactoutResult.status_code !== 200) {
      logger.warn({
        msg: '[email_waterfall_v2] ContactOut returned non-200 status',
        event: 'contactout_non_200',
        metadata: {
          officerId,
          statusCode: contactoutResult.status_code,
        },
      })

      // Authentication error
      if (contactoutResult.status_code === 401) {
        return {
          success: false,
          error: createAuthenticationError('contactout'),
        }
      }

      // Rate limit
      if (contactoutResult.status_code === 429) {
        return {
          success: false,
          error: createRateLimitError('contactout'),
        }
      }

      // Other errors
      return {
        success: false,
        error: {
          type: 'network',
          provider: 'contactout',
          message: `HTTP ${contactoutResult.status_code}`,
          isRetryable: contactoutResult.status_code >= 500,
          statusCode: contactoutResult.status_code,
        },
      }
    }

    // Extract emails from profiles
    if (
      contactoutResult.profiles &&
      Object.keys(contactoutResult.profiles).length > 0
    ) {
      const contactoutEmails: string[] = []

      for (const profile of Object.values(contactoutResult.profiles)) {
        if (profile.contact_info?.work_emails) {
          contactoutEmails.push(...profile.contact_info.work_emails)
        }
        if (profile.contact_info?.personal_emails) {
          contactoutEmails.push(...profile.contact_info.personal_emails)
        }
      }

      if (contactoutEmails.length > 0) {
        logger.info({
          msg: '[email_waterfall_v2] Emails found via ContactOut',
          event: 'emails_found_contactout',
          metadata: {
            officerId,
            emailCount: contactoutEmails.length,
          },
        })

        return {
          success: true,
          data: contactoutEmails.map((email) => ({
            officer_id: officerId,
            email: email,
            role: false,
            free: false,
            source: 'contactout',
            quality: 'good', // ContactOut doesn't provide certainty
            result: 'ok',
            is_verified: true,
          })),
          metadata: {
            emailCount: contactoutEmails.length,
            profileCount: Object.keys(contactoutResult.profiles).length,
          },
        }
      }
    }

    // No results found
    logger.info({
      msg: '[email_waterfall_v2] No emails found via ContactOut',
      event: 'contactout_no_emails',
      metadata: { officerId },
    })

    return {
      success: false,
      error: createNoResultsError('contactout', { officerId, fullName }),
    }
  } catch (error) {
    // Handle timeouts
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        error: createTimeoutError('contactout', 30000, error),
      }
    }

    // Unknown error
    logger.error({
      msg: '[email_waterfall_v2] Unexpected error in ContactOut',
      event: 'contactout_unexpected_error',
      metadata: {
        officerId,
        error: error instanceof Error ? error.message : String(error),
      },
    })

    return {
      success: false,
      error: {
        type: 'unknown',
        provider: 'contactout',
        message: 'Unexpected error occurred',
        isRetryable: true,
        context: { officerId, fullName },
        cause: error instanceof Error ? error : undefined,
      },
    }
  }
}
