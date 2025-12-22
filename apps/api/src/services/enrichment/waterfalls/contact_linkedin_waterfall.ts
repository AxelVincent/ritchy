import { logger } from '@ritchy/logger'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type * as schema from '../../../db/schema'
import { matchPersonSimple } from '../../../external/langchain/person_matcher_simple'
import { enqueueIcypeasFindPeopleJob } from '../../../internal/bullmq/jobs/icypeas/find_people/queue'
import { insertContactLinkedin } from '../../contact/queries/insert_contact_linkedin'
import {
  type ProviderError,
  type Result,
  type WaterfallResult,
  createNoResultsError,
  isSuccess,
} from '../types/error_handling'
import { getEnabledProviders } from '../waterfall_config'

interface ContactLinkedInContext {
  readonly contactId: string
  readonly existingLinkedinUrl: string | null
  readonly person: {
    firstName: string | null
    lastName: string | null
  }
  readonly place: {
    name: string | null
  }
}

interface LinkedInResult {
  profileUrl: string
  confidence: number
  reasoning: string
  source: string
}

/**
 * LinkedIn providers configuration for manual contacts
 * Note: Fewer providers available since we have less context
 */
const CONTACT_LINKEDIN_PROVIDERS = [
  {
    name: 'icypeas_find_people',
    enabled: true,
    priority: 1,
    description: 'Icypeas Find People - Fast search with LLM matching',
  },
] as const

/**
 * LinkedIn waterfall for manual contacts.
 * Stores results directly in contact_linkedin table.
 */
export const runContactLinkedInWaterfall = async (
  context: ContactLinkedInContext,
  confidenceThreshold = 60,
  tx?: PostgresJsDatabase<typeof schema>,
): Promise<WaterfallResult<LinkedInResult>> => {
  const { contactId, existingLinkedinUrl, person, place } = context
  const providersAttempted: string[] = []
  const providerErrors: Array<{ provider: string; error: ProviderError }> = []

  // If LinkedIn URL already provided, use it directly (skip search)
  if (existingLinkedinUrl) {
    const result: LinkedInResult = {
      profileUrl: existingLinkedinUrl,
      confidence: 100,
      reasoning: 'User-provided LinkedIn URL',
      source: 'user',
    }

    await insertContactLinkedin(
      {
        contactId,
        profileUrl: result.profileUrl,
        confidence: result.confidence,
        reasoning: result.reasoning,
        source: result.source,
      },
      tx,
    )

    logger.info({
      msg: '[contact_linkedin_waterfall] Using user-provided LinkedIn URL',
      event: 'contact_linkedin_user_provided',
      metadata: { contactId, profileUrl: existingLinkedinUrl },
    })

    return { status: 'success', data: result, provider: 'user' }
  }

  // Validate person has name for search
  if (!person.firstName || !person.lastName) {
    logger.debug({
      msg: '[contact_linkedin_waterfall] Skipping - missing name',
      event: 'contact_linkedin_skipped_no_name',
      metadata: { contactId },
    })

    return {
      status: 'empty',
      reason: 'validation_failed',
      providersAttempted: [],
      details: 'Contact missing first or last name',
    }
  }

  const enabledProviders = getEnabledProviders(CONTACT_LINKEDIN_PROVIDERS)

  logger.info({
    msg: '[contact_linkedin_waterfall] Starting LinkedIn waterfall for manual contact',
    event: 'contact_linkedin_waterfall_start',
    metadata: {
      contactId,
      personName: `${person.firstName} ${person.lastName}`,
      providersCount: enabledProviders.length,
    },
  })

  for (const providerConfig of enabledProviders) {
    providersAttempted.push(providerConfig.name)

    logger.info({
      msg: `[contact_linkedin_waterfall] Trying provider: ${providerConfig.name}`,
      event: 'contact_linkedin_provider_attempt',
      metadata: {
        contactId,
        provider: providerConfig.name,
      },
    })

    let result: Result<LinkedInResult, ProviderError> | null = null

    switch (providerConfig.name) {
      case 'icypeas_find_people':
        result = await enrichWithIcypeasFindPeopleSimple(
          contactId,
          person.firstName,
          person.lastName,
          place.name,
          confidenceThreshold,
        )
        break

      default:
        logger.warn({
          msg: `[contact_linkedin_waterfall] Unknown provider: ${providerConfig.name}`,
          event: 'contact_linkedin_unknown_provider',
          metadata: { contactId, provider: providerConfig.name },
        })
        continue
    }

    if (!result) continue

    if (isSuccess(result)) {
      // Persist to contact_linkedin table
      await insertContactLinkedin(
        {
          contactId,
          profileUrl: result.data.profileUrl,
          confidence: result.data.confidence,
          reasoning: result.data.reasoning,
          source: result.data.source,
        },
        tx,
      )

      logger.info({
        msg: '[contact_linkedin_waterfall] Successfully found LinkedIn profile',
        event: 'contact_linkedin_waterfall_success',
        metadata: {
          contactId,
          provider: providerConfig.name,
          profileUrl: result.data.profileUrl,
          confidence: result.data.confidence,
        },
      })

      return {
        status: 'success',
        data: result.data,
        provider: providerConfig.name,
        confidence: result.data.confidence,
      }
    }

    // Provider failed
    providerErrors.push({
      provider: providerConfig.name,
      error: result.error,
    })

    logger.warn({
      msg: `[contact_linkedin_waterfall] Provider ${providerConfig.name} failed`,
      event: 'contact_linkedin_provider_failed',
      metadata: {
        contactId,
        provider: providerConfig.name,
        errorType: result.error.type,
      },
    })
  }

  // All providers failed
  logger.info({
    msg: '[contact_linkedin_waterfall] All providers failed',
    event: 'contact_linkedin_waterfall_all_failed',
    metadata: { contactId, providersAttempted },
  })

  return {
    status: 'empty',
    reason: 'no_results',
    providersAttempted,
    details: `All ${providersAttempted.length} providers failed to find LinkedIn profile`,
  }
}

/**
 * Simplified Icypeas Find People for manual contacts (no company context)
 */
const enrichWithIcypeasFindPeopleSimple = async (
  contactId: string,
  firstName: string,
  lastName: string,
  placeName: string | null,
  confidenceThreshold: number,
): Promise<Result<LinkedInResult, ProviderError>> => {
  try {
    const findPeopleResult = await enqueueIcypeasFindPeopleJob({
      query: {
        firstname: { include: [firstName] },
        lastname: { include: [lastName] },
      },
      pagination: { size: 25 },
    })

    logger.info({
      msg: '[contact_linkedin_waterfall] Icypeas Find People result',
      event: 'contact_icypeas_find_people_result',
      metadata: {
        contactId,
        personName: `${firstName} ${lastName}`,
        peopleFound: findPeopleResult.leads.length,
        total: findPeopleResult.total,
      },
    })

    if (findPeopleResult.leads.length === 0) {
      return {
        success: false,
        error: createNoResultsError('icypeas_find_people', { contactId }),
      }
    }

    // Use simplified LLM matching (no company context)
    const matchResult = await matchPersonSimple(
      {
        first_name: firstName,
        last_name: lastName,
      },
      placeName,
      findPeopleResult.leads,
    )

    if (
      matchResult.bestMatch &&
      matchResult.bestMatch.confidence >= confidenceThreshold
    ) {
      return {
        success: true,
        data: {
          profileUrl: matchResult.bestMatch.profileUrl,
          confidence: matchResult.bestMatch.confidence,
          reasoning: matchResult.bestMatch.reasoning,
          source: 'icypeas_find_people',
        },
      }
    }

    logger.info({
      msg: '[contact_linkedin_waterfall] No confident match found',
      event: 'contact_linkedin_low_confidence',
      metadata: {
        contactId,
        bestConfidence: matchResult.bestMatch?.confidence ?? 0,
        threshold: confidenceThreshold,
      },
    })

    return {
      success: false,
      error: createNoResultsError('icypeas_find_people', {
        contactId,
        bestConfidence: matchResult.bestMatch?.confidence ?? 0,
      }),
    }
  } catch (error) {
    logger.error({
      msg: '[contact_linkedin_waterfall] Icypeas Find People failed',
      event: 'contact_icypeas_find_people_error',
      metadata: {
        contactId,
        error: error instanceof Error ? error.message : String(error),
      },
    })

    return {
      success: false,
      error: {
        type: 'unknown',
        provider: 'icypeas_find_people',
        message: error instanceof Error ? error.message : 'Unknown error',
        isRetryable: true,
        context: { contactId },
      },
    }
  }
}
