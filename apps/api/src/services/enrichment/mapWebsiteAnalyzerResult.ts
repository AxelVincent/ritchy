import type { EnrichResponse } from '@ritchy/types'
import type { WebsiteAnalyzerResult } from '../../external/website_analyzer/types'

/**
 * Maps the website analyzer result to the expected API response format
 * @param result The raw website analyzer result
 * @returns Formatted response matching EnrichResponseSchema
 */
export const mapWebsiteAnalyzerResult = (
  result: WebsiteAnalyzerResult,
): EnrichResponse => {
  return {
    business_info: {
      name: result.business_info?.name,
      sector: result.business_info?.sector,
      description: result.business_info?.description,
      registration_info: result.business_info?.registration_info,
      structure: result.business_info?.structure,
      founded: result.business_info?.founded,
      languages: result.business_info?.languages ?? [],
      source: result.business_info?.source,
    },
    products_services: {
      specialties: result.products_services?.specialties ?? [],
      price_range: result.products_services?.price_range,
      service_area: result.products_services?.service_area,
      source: result.products_services?.source,
    },
    target_customers: {
      primary_segments: result.target_customers?.primary_segments ?? [],
      needs_addressed: result.target_customers?.needs_addressed ?? [],
      key_benefits: result.target_customers?.key_benefits ?? [],
      b2c_focus: result.target_customers?.b2c_focus,
      b2b_focus: result.target_customers?.b2b_focus,
      source: result.target_customers?.source,
    },
    contact_info: {
      address: result.contact_info?.address,
      email: result.contact_info?.email,
      phone: result.contact_info?.phone,
      whatsapp: result.contact_info?.whatsapp,
      website: result.contact_info?.website,
      contact_form_url: result.contact_info?.contact_form_url,
      visit_info: result.contact_info?.visit_info,
      source: result.contact_info?.source,
    },
    social_networks: {
      facebook: result.social_networks?.facebook,
      instagram: result.social_networks?.instagram,
      linkedin: result.social_networks?.linkedin,
      twitter: result.social_networks?.twitter,
      source: result.social_networks?.source,
    },
    last_updated: result.last_updated,
  }
}
