import { logger } from '@ritchy/logger'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type * as schema from '../../../../../db/schema'
import {
  type InsertOfficerEmailData,
  insertEnrichmentCompanyOfficerEmails,
} from '../../../queries/insert_enrichment_company_officer_emails'
import {
  type ProviderError,
  type Result,
  type WaterfallResult,
  createWaterfallError,
  isSuccess,
} from '../../../types/error_handling'
import type { ValidatedOfficerData } from '../../../utils/validate_officer'
import { EMAIL_PROVIDERS, getEnabledProviders } from '../../../waterfall_config'
import { enrichWithContactOutEmail } from './providers/enrich_with_contactout_email'
import { enrichWithIcypeasEmail } from './providers/enrich_with_icypeas_email'

/**
 * Core email enrichment logic with comprehensive error handling
 * Returns WaterfallResult<T> with detailed status and error information
 */
export const enrichEmailCore = async (
  validated: ValidatedOfficerData,
  domain: string,
  tx?: PostgresJsDatabase<typeof schema>,
): Promise<WaterfallResult<InsertOfficerEmailData[]>> => {
  const enabledProviders = getEnabledProviders(EMAIL_PROVIDERS)
  const providerErrors: Array<{ provider: string; error: ProviderError }> = []
  const providersAttempted: string[] = []

  logger.info({
    msg: '[email_waterfall_v2] Starting email waterfall enrichment',
    event: 'email_waterfall_start',
    metadata: {
      officerId: validated.id,
      officerName: validated.fullName,
      domain,
      providersCount: enabledProviders.length,
      providers: enabledProviders.map((p) => p.name),
    },
  })

  for (const providerConfig of enabledProviders) {
    providersAttempted.push(providerConfig.name)

    logger.info({
      msg: `[email_waterfall_v2] Trying email provider: ${providerConfig.name}`,
      event: 'email_provider_attempt',
      metadata: {
        officerId: validated.id,
        provider: providerConfig.name,
        priority: providerConfig.priority,
      },
    })

    let result: Result<InsertOfficerEmailData[], ProviderError>

    // Call provider based on name
    switch (providerConfig.name) {
      case 'icypeas_email':
        result = await enrichWithIcypeasEmail(
          validated.id,
          validated.firstName,
          validated.lastName,
          domain,
        )
        break

      case 'contactout_email':
        result = await enrichWithContactOutEmail(
          validated.id,
          validated.firstName,
          validated.lastName,
        )
        break

      default:
        logger.warn({
          msg: `[email_waterfall_v2] Unknown provider: ${providerConfig.name}`,
          event: 'unknown_email_provider',
          metadata: { provider: providerConfig.name },
        })
        continue
    }

    // Handle provider result
    if (isSuccess(result)) {
      // Success! Insert data and return
      await insertEnrichmentCompanyOfficerEmails(result.data, tx)

      logger.info({
        msg: '[email_waterfall_v2] Successfully enriched emails',
        event: 'email_waterfall_success',
        metadata: {
          officerId: validated.id,
          provider: providerConfig.name,
          emailCount: result.data.length,
        },
      })

      return {
        status: 'success',
        data: result.data,
        provider: providerConfig.name,
        metadata: result.metadata,
      }
    }

    // Provider failed - collect error and try next
    providerErrors.push({
      provider: providerConfig.name,
      error: result.error,
    })

    logger.warn({
      msg: `[email_waterfall_v2] Provider ${providerConfig.name} failed`,
      event: 'email_provider_failed',
      metadata: {
        officerId: validated.id,
        provider: providerConfig.name,
        errorType: result.error.type,
        errorMessage: result.error.message,
        isRetryable: result.error.isRetryable,
      },
    })

    // Continue to next provider
  }

  // All providers failed
  logger.error({
    msg: '[email_waterfall_v2] All email providers failed',
    event: 'email_waterfall_all_failed',
    metadata: {
      officerId: validated.id,
      providersAttempted,
      errorCount: providerErrors.length,
      errors: providerErrors.map((pe) => ({
        provider: pe.provider,
        type: pe.error.type,
        isRetryable: pe.error.isRetryable,
      })),
    },
  })

  return {
    status: 'failed',
    error: createWaterfallError('email', providersAttempted, providerErrors),
    providersAttempted,
  }
}
