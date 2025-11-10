import { logger } from '@ritchy/logger'
import { enqueueIcypeasEmailSearchJob } from '../../../../../../internal/bullmq/jobs/icypeas/email_search/queue'
import type { InsertOfficerEmailData } from '../../../../queries/insert_enrichment_company_officer_emails'
import {
  type ProviderError,
  type Result,
  createAuthenticationError,
  createNoResultsError,
  createRateLimitError,
  createTimeoutError,
} from '../../../../types/error_handling'
import { mapEmailCertaintyToQuality } from '../../../../utils/map_email_certainty_to_quality'

/**
 * Provider function for Icypeas email search
 * Returns Result<T, ProviderError> for consistent error handling
 */
export const enrichWithIcypeasEmail = async (
  officerId: string,
  firstName: string,
  lastName: string,
  domain: string,
): Promise<Result<InsertOfficerEmailData[], ProviderError>> => {
  try {
    const emailSearchResult = await enqueueIcypeasEmailSearchJob({
      firstname: firstName,
      lastname: lastName,
      domainOrCompany: domain,
    })

    // Handle success with results
    if (emailSearchResult.success && emailSearchResult.emails.length > 0) {
      logger.info({
        msg: '[email_waterfall_v2] Emails found via Icypeas',
        event: 'emails_found_icypeas',
        metadata: {
          officerId,
          emailCount: emailSearchResult.emails.length,
          searchId: emailSearchResult.searchId,
        },
      })

      return {
        success: true,
        data: emailSearchResult.emails.map((email) => ({
          officer_id: officerId,
          email: email.email,
          role: false,
          free: false,
          source: 'icypeas',
          quality: mapEmailCertaintyToQuality(email.certainty),
          result: 'ok',
          is_verified: true,
        })),
        metadata: {
          searchId: emailSearchResult.searchId,
          emailCount: emailSearchResult.emails.length,
        },
      }
    }

    // No results is not an error - it's an expected outcome
    logger.info({
      msg: '[email_waterfall_v2] No emails found via Icypeas',
      event: 'emails_not_found_icypeas',
      metadata: {
        officerId,
        status: emailSearchResult.status,
      },
    })

    return {
      success: false,
      error: createNoResultsError('icypeas', { officerId, domain }),
    }
  } catch (error) {
    // Handle specific error types
    if (error instanceof Error) {
      // Timeout error
      if (error.name === 'AbortError') {
        logger.warn({
          msg: '[email_waterfall_v2] Icypeas request timed out',
          event: 'icypeas_timeout',
          metadata: { officerId },
        })

        return {
          success: false,
          error: createTimeoutError('icypeas', 30000, error),
        }
      }

      // Check for authentication errors
      if (
        error.message.includes('authentication') ||
        error.message.includes('401')
      ) {
        logger.error({
          msg: '[email_waterfall_v2] Icypeas authentication failed',
          event: 'icypeas_auth_failed',
          metadata: { officerId },
        })

        return {
          success: false,
          error: createAuthenticationError('icypeas', error),
        }
      }

      // Check for rate limit
      if (
        error.message.includes('rate limit') ||
        error.message.includes('429')
      ) {
        logger.warn({
          msg: '[email_waterfall_v2] Icypeas rate limit exceeded',
          event: 'icypeas_rate_limit',
          metadata: { officerId },
        })

        return {
          success: false,
          error: createRateLimitError('icypeas', undefined, error),
        }
      }
    }

    // Unknown error - log and return generic error
    logger.error({
      msg: '[email_waterfall_v2] Unexpected error in Icypeas',
      event: 'icypeas_unexpected_error',
      metadata: {
        officerId,
        error: error instanceof Error ? error.message : String(error),
      },
    })

    return {
      success: false,
      error: {
        type: 'unknown',
        provider: 'icypeas',
        message: 'Unexpected error occurred',
        isRetryable: true,
        context: { officerId, domain },
        cause: error instanceof Error ? error : undefined,
      },
    }
  }
}
