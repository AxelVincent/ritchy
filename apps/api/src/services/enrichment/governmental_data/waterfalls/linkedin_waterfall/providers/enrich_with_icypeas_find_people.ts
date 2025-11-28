import { logger } from '@ritchy/logger'
import { matchPerson } from '../../../../../../external/langchain/person_matcher'
import { enqueueIcypeasFindPeopleJob } from '../../../../../../internal/bullmq/jobs/icypeas/find_people/queue'
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
import type { ValidatedOfficerData } from '../../../../utils/validate_officer'
import type { LinkedInResult } from '../index'

export const enrichWithIcypeasFindPeople = async (
  validated: ValidatedOfficerData,
  company: CompanyContextData & { activities: ActivityData[] },
  place: PlaceContextData,
): Promise<Result<LinkedInResult, ProviderError>> => {
  const findPeopleResult = await enqueueIcypeasFindPeopleJob({
    query: {
      firstname: {
        include: [validated.firstName],
      },
      lastname: {
        include: [validated.lastName],
      },
    },
    pagination: {
      size: 25,
    },
  })

  logger.info({
    msg: '[linkedin_waterfall] Icypeas Find People API result',
    event: 'icypeas_find_people_result',
    metadata: {
      officerId: validated.id,
      officerName: validated.fullName,
      peopleFound: findPeopleResult.leads.length,
      total: findPeopleResult.total,
    },
  })

  // Use LLM to match the best person
  if (findPeopleResult.leads.length > 0) {
    const matchResult = await matchPerson(
      {
        first_name: validated.firstName,
        last_name: validated.lastName,
        role: validated.role,
        date_of_appointment: validated.date_of_appointment,
        date_of_birth: validated.date_of_birth,
        gender: validated.gender,
        nationality: validated.nationality,
        address_line_1: validated.address_line_1,
        city: validated.city,
        country: validated.country,
      },
      {
        name: company.name,
        company_number: company.company_number,
        status: company.status,
        country_code: company.country_code,
        head_office_city: company.head_office_city,
        workforce: company.workforce,
        workforce_range: company.workforce_range,
        local_legal_form_name: company.local_legal_form_name,
        activities: company.activities,
      },
      place,
      findPeopleResult.leads,
    )

    if (matchResult.bestMatch && matchResult.bestMatch.confidence >= 60) {
      logger.info({
        msg: '[linkedin_waterfall] Best person match found',
        event: 'person_match_found',
        metadata: {
          officerId: validated.id,
          officerName: validated.fullName,
          profileUrl: matchResult.bestMatch.profileUrl,
          confidence: matchResult.bestMatch.confidence,
          reasoning: matchResult.bestMatch.reasoning,
          alternativeCount: matchResult.alternatives.length,
        },
      })

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
      msg: '[linkedin_waterfall] No confident person match found',
      event: 'person_match_low_confidence',
      metadata: {
        officerId: validated.id,
        officerName: validated.fullName,
        bestConfidence: matchResult.bestMatch?.confidence || 0,
      },
    })
  }

  return {
    success: false,
    error: createNoResultsError('icypeas_find_people', {
      officerId: validated.id,
      leadCount: findPeopleResult.leads.length,
    }),
  }
}
