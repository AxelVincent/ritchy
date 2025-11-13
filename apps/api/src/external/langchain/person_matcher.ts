import { logger } from '@ritchy/logger'
import type { Place } from '../../db/schema'
import { formatDateOfBirthWithAge } from '../../utils/calculate_age'
import type { Person } from '../icypeas/find_people'
import { anthropic_haiku } from './llms'
import { PersonMatchSchema, personMatcher } from './prompts/person_matcher'

export interface OfficerContext {
  first_name: string
  last_name: string
  role?: string | null
  date_of_appointment?: Date | null
  date_of_birth?: Date | null
  gender?: string | null
  nationality?: string | null
  address_line_1?: string | null
  city?: string | null
  country?: string | null
}

export interface CompanyContext {
  name: string
  company_number: string
  status: string
  country_code: string
  head_office_city?: string | null
  workforce?: number | null
  workforce_range?: string | null
  local_legal_form_name?: string | null
  activities?: Array<{ code?: string | null; name?: string | null }>
}

export const matchPerson = async (
  officer: OfficerContext,
  company: CompanyContext,
  place: Place,
  searchResults: Person[],
) => {
  // Validate required fields
  if (!officer.first_name || !officer.last_name) {
    logger.warn({
      msg: 'Officer missing required name fields',
      event: 'person_match_invalid_input',
      metadata: {
        hasFirstName: !!officer.first_name,
        hasLastName: !!officer.last_name,
      },
    })
    return {
      bestMatch: null,
      alternatives: [],
    }
  }

  if (!company.name) {
    logger.warn({
      msg: 'Company missing required name field',
      event: 'person_match_invalid_input',
      metadata: { companyNumber: company.company_number },
    })
    return {
      bestMatch: null,
      alternatives: [],
    }
  }

  logger.debug({
    msg: 'Matching person with AI analysis',
    event: 'person_match_start',
    metadata: {
      officerName: `${officer.first_name} ${officer.last_name}`,
      companyName: company.name,
      resultCount: searchResults.length,
      hasRole: !!officer.role,
      hasCompanyActivities: !!company.activities?.length,
    },
  })

  // Handle empty search results
  if (!searchResults || searchResults.length === 0) {
    logger.debug({
      msg: 'No search results to match against',
      event: 'person_match_no_results',
      metadata: { officerName: `${officer.first_name} ${officer.last_name}` },
    })

    return {
      bestMatch: null,
      alternatives: [],
    }
  }

  const structuredOutput =
    anthropic_haiku.withStructuredOutput(PersonMatchSchema)

  // Format search results for LLM - optimized for token efficiency
  const formattedResults = searchResults
    .map((person, index) => {
      const jobTitle = person.lastJobTitle || person.headline || 'No title'
      const companyName = person.lastCompanyName || 'No company'
      const companyInfo = person.lastCompanyWebsite
        ? `${companyName} (${person.lastCompanyWebsite})`
        : companyName
      const location =
        person.address || person.lastCompanyAddress || 'No location'
      const startDate = person.lastJobStartDate || 'Unknown'

      const fields = [
        `${index + 1}. ${person.firstname || ''} ${person.lastname || ''}`,
        `LinkedIn: ${person.profileUrl || 'N/A'}`,
        `Current: ${jobTitle} at ${companyInfo}`,
        person.lastCompanyIndustry && `Industry: ${person.lastCompanyIndustry}`,
        `Started: ${startDate}`,
        `Location: ${location}`,
        person.description &&
          `Bio: ${person.description.substring(0, 150)}${person.description.length > 150 ? '...' : ''}`,
      ].filter(Boolean)

      return fields.join('\n   ')
    })
    .join('\n\n')

  // Prepare context data with fallbacks
  const officerAddress =
    [officer.address_line_1, officer.city, officer.country]
      .filter(Boolean)
      .join(', ') || 'Not specified'

  const companyActivities =
    company.activities
      ?.map((a) => a.name)
      .filter(Boolean)
      .join(', ') || 'Not specified'

  const placeTypes = place.types?.join(', ') || 'Not specified'

  // Format date of birth with age if available
  const officerDateOfBirth = officer.date_of_birth
    ? formatDateOfBirthWithAge(officer.date_of_birth)
    : 'Not specified'

  const prompt = await personMatcher.invoke({
    officerFirstName: officer.first_name || '',
    officerLastName: officer.last_name || '',
    officerRole: officer.role || 'Not specified',
    appointmentDate:
      officer.date_of_appointment?.toISOString().split('T')[0] ||
      'Not specified',
    officerDateOfBirth,
    officerNationality: officer.nationality || 'Not specified',
    officerAddress,
    companyName: company.name,
    companyNumber: company.company_number,
    companyStatus: company.status,
    companyCountry: company.country_code,
    companyCity: company.head_office_city || 'Not specified',
    companyWorkforce:
      company.workforce?.toString() ||
      company.workforce_range ||
      'Not specified',
    companyLegalForm: company.local_legal_form_name || 'Not specified',
    companyActivities,
    placeName: place.name || 'Unknown',
    placeAddress: place.formatted_address || 'Unknown',
    placeCity: place.locality || 'Unknown',
    placeCountry: place.country || 'Unknown',
    placePhone: place.phone || 'Unknown',
    placeWebsite: place.website || 'Unknown',
    placeTypes,
    searchResults: formattedResults,
  })

  const result = await structuredOutput.invoke(prompt)

  logger.info({
    msg: 'Person matching result',
    event: 'person_match_result',
    metadata: {
      officerName: `${officer.first_name} ${officer.last_name}`,
      companyName: company.name,
      bestMatch: result.bestMatch?.profileUrl,
      bestMatchConfidence: result.bestMatch?.confidence,
      alternativeCount: result.alternatives.length,
    },
  })

  return result
}
