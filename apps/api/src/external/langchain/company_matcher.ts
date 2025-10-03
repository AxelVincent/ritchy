import { logger } from '@ritchy/logger'
import type { Place } from '../../db/schema'
import type { InternationalSearchResponse } from '../pappers/international_search_v1'
import { anthropic_haiku } from './llms'
import { CompanyMatchSchema, companyMatcher } from './prompts/company_matcher'

export const matchCompany = async (
  place: Place,
  searchResults: InternationalSearchResponse,
) => {
  logger.debug({
    msg: 'Matching company with enhanced AI analysis',
    event: 'company_match_start',
    metadata: {
      placeName: place.name,
      resultCount: searchResults.results.length,
      hasBusinessTypes: !!place.types?.length,
      hasRating: !!place.rating,
      hasPhone: !!place.phone,
      hasWebsite: !!place.website,
    },
  })

  // Handle empty search results
  if (!searchResults.results || searchResults.results.length === 0) {
    logger.debug({
      msg: 'No search results to match against',
      event: 'company_match_no_results',
      metadata: { placeName: place.name },
    })

    return {
      bestMatch: null,
      alternatives: [],
    }
  }

  const structuredOutput =
    anthropic_haiku.withStructuredOutput(CompanyMatchSchema)

  const formattedResults = searchResults.results
    .map((result, index) => {
      const address = result.head_office
        ? `${result.head_office.address_line_1 || ''} ${result.head_office.city || ''} ${result.head_office.postal_code || ''}`.trim()
        : 'No address'

      const activities = result.activities?.length
        ? result.activities
            .map((a) => a.name)
            .filter(Boolean)
            .join(', ')
        : 'No activities listed'

      const localActivities = result.local_activities?.length
        ? result.local_activities
            .map((a) => a.name)
            .filter(Boolean)
            .join(', ')
        : 'No local activities listed'

      return `${index + 1}. Company Number: ${result.company_number}
   Name: ${result.name}
   Address: ${address}
   Country: ${result.country_code}
   Status: ${result.status}
   Legal Form: ${result.local_legal_form_name || 'N/A'}
   Creation Date: ${result.date_of_creation || 'N/A'}
   Activities: ${activities}
   Local Activities: ${localActivities}
   Type: ${result.type || 'N/A'}`
    })
    .join('\n\n')

  // Prepare enhanced place data
  const businessTypes = place.types?.join(', ') || 'Not specified'
  const primaryType = place.primary_type || 'Not specified'
  const rating = place.rating ? `${place.rating}` : 'No rating'
  const ratingCount = place.rating_count || 0
  const priceLevel = place.price_level || 'Not specified'
  const postalCode = place.postal_code || 'Not specified'
  const street = place.street
    ? `${place.street} ${place.street_number || ''}`.trim()
    : 'Not specified'

  const administrativeAreas =
    [
      place.administrative_area_level_1,
      place.administrative_area_level_2,
      place.administrative_area_level_3,
    ]
      .filter(Boolean)
      .join(', ') || 'Not specified'

  const hasOperatingHours = place.opening_hours ? 'Yes' : 'No'

  const prompt = await companyMatcher.invoke({
    placeName: place.name || 'Unknown',
    placeAddress: place.formatted_address || 'Unknown',
    placeCity: place.locality || 'Unknown',
    placeCountry: place.country || 'Unknown',
    placePhone: place.phone || 'Unknown',
    placeWebsite: place.website || 'Unknown',
    businessTypes,
    primaryType,
    rating,
    ratingCount: ratingCount.toString(),
    priceLevel,
    postalCode,
    street,
    administrativeAreas,
    hasOperatingHours,
    searchResults: formattedResults,
  })

  const result = await structuredOutput.invoke(prompt)

  logger.info({
    msg: 'Enhanced company matching result',
    event: 'company_match_result',
    metadata: {
      placeName: place.name,
      bestMatch: result.bestMatch,
      bestMatchConfidence: result.bestMatch?.confidence,
      alternativeCount: result.alternatives.length,
      usedBusinessTypes: businessTypes !== 'Not specified',
      usedRating: rating !== 'No rating',
      usedPriceLevel: priceLevel !== 'Not specified',
    },
  })

  return result
}
