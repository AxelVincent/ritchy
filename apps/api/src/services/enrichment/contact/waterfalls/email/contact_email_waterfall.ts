import { logger } from '@ritchy/logger'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { db } from '../../../../../db/db'
import { contactEmail } from '../../../../../db/schema'
import type * as schema from '../../../../../db/schema'
import { enqueueIcypeasEmailSearchJob } from '../../../../../internal/bullmq/jobs/icypeas/email_search/queue'
import type { EmailQuality, EmailResult } from '../../../../../shared'
import { getMainDomain } from '../../../company/scraper/utils/get_main_domain'
import {
  EMAIL_PROVIDERS,
  getEnabledProviders,
} from '../../../shared/config/waterfall_config'
import {
  type ProviderError,
  type Result,
  type WaterfallResult,
  createNoResultsError,
  createWaterfallError,
  isSuccess,
} from '../../../shared/types/error_handling'
import { mapEmailCertaintyToQuality } from '../../../shared/utils/map_email_certainty_to_quality'

interface ContactEmailContext {
  readonly contactId: string
  readonly person: {
    firstName: string | null
    lastName: string | null
  }
  readonly website: string | null
}

interface ContactEmailResult {
  email: string
  isVerified: boolean
  source: string
  quality: EmailQuality | null
  result: EmailResult | null
  isRole: boolean
  isFree: boolean
}

/**
 * Email waterfall for manual contacts.
 * Stores results directly in contact_email table.
 */
export const runContactEmailWaterfall = async (
  context: ContactEmailContext,
  tx?: PostgresJsDatabase<typeof schema>,
): Promise<WaterfallResult<ContactEmailResult[]>> => {
  const { contactId, person, website } = context
  const database = tx ?? db
  const providersAttempted: string[] = []
  const providerErrors: Array<{ provider: string; error: ProviderError }> = []

  // Validate person has name
  if (!person.firstName || !person.lastName) {
    logger.debug({
      msg: '[contact_email_waterfall] Skipping - missing name',
      event: 'contact_email_skipped_no_name',
      metadata: { contactId },
    })

    return {
      status: 'empty',
      reason: 'validation_failed',
      providersAttempted: [],
      details: 'Contact missing first or last name',
    }
  }

  // Extract domain from website
  const domain = website ? getMainDomain(website) : null
  if (!domain) {
    logger.debug({
      msg: '[contact_email_waterfall] Skipping - no domain available',
      event: 'contact_email_skipped_no_domain',
      metadata: { contactId, website },
    })

    return {
      status: 'empty',
      reason: 'skipped',
      providersAttempted: [],
      details: 'No domain available for email search',
    }
  }

  const enabledProviders = getEnabledProviders(EMAIL_PROVIDERS)

  logger.info({
    msg: '[contact_email_waterfall] Starting email waterfall for manual contact',
    event: 'contact_email_waterfall_start',
    metadata: {
      contactId,
      personName: `${person.firstName} ${person.lastName}`,
      domain,
      providersCount: enabledProviders.length,
    },
  })

  for (const providerConfig of enabledProviders) {
    providersAttempted.push(providerConfig.name)

    logger.info({
      msg: `[contact_email_waterfall] Trying provider: ${providerConfig.name}`,
      event: 'contact_email_provider_attempt',
      metadata: {
        contactId,
        provider: providerConfig.name,
      },
    })

    let result: Result<ContactEmailResult[], ProviderError> | null = null

    switch (providerConfig.name) {
      case 'icypeas_email':
        result = await enrichWithIcypeasEmailForContact(
          contactId,
          person.firstName,
          person.lastName,
          domain,
        )
        break

      default:
        logger.warn({
          msg: `[contact_email_waterfall] Unknown provider: ${providerConfig.name}`,
          event: 'contact_email_unknown_provider',
          metadata: { contactId, provider: providerConfig.name },
        })
        continue
    }

    if (!result) continue

    if (isSuccess(result)) {
      // Store directly in contact_email table
      for (let i = 0; i < result.data.length; i++) {
        const email = result.data[i]
        await database
          .insert(contactEmail)
          .values({
            contact_id: contactId,
            email: email.email,
            is_primary: i === 0,
            is_verified: email.isVerified,
            source: email.source,
            quality: email.quality,
            result: email.result,
            role: email.isRole,
            free: email.isFree,
          })
          .onConflictDoNothing()
      }

      logger.info({
        msg: '[contact_email_waterfall] Successfully found emails',
        event: 'contact_email_waterfall_success',
        metadata: {
          contactId,
          provider: providerConfig.name,
          emailCount: result.data.length,
        },
      })

      return {
        status: 'success',
        data: result.data,
        provider: providerConfig.name,
      }
    }

    // Provider failed
    providerErrors.push({
      provider: providerConfig.name,
      error: result.error,
    })

    logger.warn({
      msg: `[contact_email_waterfall] Provider ${providerConfig.name} failed`,
      event: 'contact_email_provider_failed',
      metadata: {
        contactId,
        provider: providerConfig.name,
        errorType: result.error.type,
      },
    })
  }

  // All providers failed
  logger.info({
    msg: '[contact_email_waterfall] All providers failed',
    event: 'contact_email_waterfall_all_failed',
    metadata: { contactId, providersAttempted },
  })

  return {
    status: 'failed',
    error: createWaterfallError('email', providersAttempted, providerErrors),
    providersAttempted,
  }
}

/**
 * Icypeas email search adapted for contact (not officer)
 */
const enrichWithIcypeasEmailForContact = async (
  contactId: string,
  firstName: string,
  lastName: string,
  domain: string,
): Promise<Result<ContactEmailResult[], ProviderError>> => {
  try {
    const emailSearchResult = await enqueueIcypeasEmailSearchJob({
      firstname: firstName,
      lastname: lastName,
      domainOrCompany: domain,
    })

    if (emailSearchResult.success && emailSearchResult.emails.length > 0) {
      logger.info({
        msg: '[contact_email_waterfall] Emails found via Icypeas',
        event: 'contact_emails_found_icypeas',
        metadata: {
          contactId,
          emailCount: emailSearchResult.emails.length,
          searchId: emailSearchResult.searchId,
        },
      })

      return {
        success: true,
        data: emailSearchResult.emails.map((email) => ({
          email: email.email,
          isVerified: true,
          source: 'icypeas',
          quality: mapEmailCertaintyToQuality(email.certainty),
          result: 'ok' as EmailResult,
          isRole: false,
          isFree: false,
        })),
      }
    }

    logger.info({
      msg: '[contact_email_waterfall] No emails found via Icypeas',
      event: 'contact_emails_not_found_icypeas',
      metadata: { contactId, status: emailSearchResult.status },
    })

    return {
      success: false,
      error: createNoResultsError('icypeas', { contactId, domain }),
    }
  } catch (error) {
    logger.error({
      msg: '[contact_email_waterfall] Icypeas email search failed',
      event: 'contact_icypeas_email_error',
      metadata: {
        contactId,
        error: error instanceof Error ? error.message : String(error),
      },
    })

    return {
      success: false,
      error: {
        type: 'unknown',
        provider: 'icypeas',
        message: error instanceof Error ? error.message : 'Unknown error',
        isRetryable: true,
        context: { contactId, domain },
      },
    }
  }
}
