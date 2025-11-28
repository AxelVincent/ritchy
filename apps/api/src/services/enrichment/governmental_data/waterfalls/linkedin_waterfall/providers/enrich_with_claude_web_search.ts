import { logger } from '@ritchy/logger'
import { findLinkedInProfile } from '../../../../../../external/langchain/linkedin_search_with_brightdata'
import type {
  ActivityData,
  CompanyContextData,
  PlaceContextData,
} from '../../../../queries/get_officers_enrichment_context'
import {
  type ProviderError,
  type Result,
  createNoResultsError,
} from '../../../../types/error_handling'
import {
  classifyError,
  validateRequiredFields,
} from '../../../../types/provider_helpers'
import type { ValidatedOfficerData } from '../../../../utils/validate_officer'
import type { LinkedInResult } from '../index'

const MINIMUM_CONFIDENCE_THRESHOLD = 60

/**
 * Enrich officer with LinkedIn profile using BrightData Google Search + Claude
 *
 * This provider uses BrightData's MCP server for Google search and Claude for analysis.
 *
 * Advantages over Brave Search:
 * - Better search quality (Google > Brave)
 * - No rate limiting issues
 * - More reliable results
 * - Single vendor integration
 *
 * @param validated - Validated officer data
 * @param company - Company context including activities
 * @param place - Place context for officer location
 * @returns Result with LinkedIn data if found with sufficient confidence
 */
export const enrichWithClaudeWebSearch = async (
  validated: ValidatedOfficerData,
  company: CompanyContextData & { activities: ActivityData[] },
  place: PlaceContextData,
): Promise<Result<LinkedInResult, ProviderError>> => {
  logger.info({
    msg: '[linkedin_waterfall] Starting BrightData LinkedIn enrichment',
    event: 'linkedin_waterfall_brightdata_start',
    metadata: {
      officerId: validated.id,
      officerName: validated.fullName,
      companyName: company.name,
    },
  })

  // Validate required fields
  const missingFields = validateRequiredFields(validated, [
    'firstName',
    'lastName',
  ])

  if (missingFields.length > 0) {
    logger.warn({
      msg: '[linkedin_waterfall] Missing required name fields',
      event: 'linkedin_waterfall_brightdata_invalid_input',
      metadata: {
        officerId: validated.id,
        missingFields,
      },
    })

    return {
      success: false,
      error: createNoResultsError('claude_web_search', {
        reason: 'missing_required_fields',
        missingFields,
        officerId: validated.id,
      }),
    }
  }

  try {
    // Execute search with BrightData + Claude
    const result = await findLinkedInProfile(
      {
        firstName: validated.firstName,
        lastName: validated.lastName,
        role: validated.role,
      },
      company.name,
      place.name ?? undefined,
    )

    // Validate result
    if (
      !result ||
      result.confidence < MINIMUM_CONFIDENCE_THRESHOLD ||
      !result.profileUrl
    ) {
      logger.info({
        msg: '[linkedin_waterfall] No valid LinkedIn profile found',
        event: 'linkedin_waterfall_brightdata_no_valid_result',
        metadata: {
          officerId: validated.id,
          officerName: validated.fullName,
          hasResult: !!result,
          confidence: result?.confidence,
          threshold: MINIMUM_CONFIDENCE_THRESHOLD,
          hasProfileUrl: !!result?.profileUrl,
        },
      })

      return {
        success: false,
        error: createNoResultsError('claude_web_search', {
          officerId: validated.id,
          confidence: result?.confidence,
          threshold: MINIMUM_CONFIDENCE_THRESHOLD,
        }),
      }
    }

    logger.info({
      msg: '[linkedin_waterfall] LinkedIn profile found successfully',
      event: 'linkedin_waterfall_brightdata_success',
      metadata: {
        officerId: validated.id,
        confidence: result.confidence,
        profileUrl: result.profileUrl,
        matchDetails: result.matchDetails,
      },
    })

    return {
      success: true,
      data: {
        profileUrl: result.profileUrl,
        confidence: result.confidence,
        reasoning: result.reasoning,
        source: 'claude_web_search',
      },
    }
  } catch (error) {
    logger.error({
      msg: '[linkedin_waterfall] BrightData LinkedIn enrichment failed',
      event: 'linkedin_waterfall_brightdata_error',
      metadata: {
        officerId: validated.id,
        officerName: validated.fullName,
        error: error instanceof Error ? error.message : String(error),
      },
    })

    // Classify and return error
    return {
      success: false,
      error: classifyError('claude_web_search', error, {
        officerId: validated.id,
        companyName: company.name,
      }),
    }
  }
}
