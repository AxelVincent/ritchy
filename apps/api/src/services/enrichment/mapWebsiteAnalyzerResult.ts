import type { EnrichResponse } from '@ritchy/types'
import type { WebsiteAnalyzerResult } from '../../external/website_analyzer/types'

/**
 * Maps the website analyzer result to the expected API response format
 * @param result The raw website analyzer result
 * @param placeId Optional place ID to include in the response
 * @returns Formatted response matching EnrichResponseSchema
 */
export const mapWebsiteAnalyzerResult = (
  result: WebsiteAnalyzerResult,
): EnrichResponse => {
  return {
    sector: result.sector,
    tone: result.tone,
    values: result.values,
    description: result.description,
    social_networks: result.social_networks,
    contact_info: {
      address: result.contact_info?.address,
      email: result.contact_info?.email,
      phone: result.contact_info?.phone,
      website: result.contact_info?.website,
      contact_url: result.contact_info?.contact_url,
    },
    last_updated: result.last_updated,
  }
}
