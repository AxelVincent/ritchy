import { eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { db } from '../../../../db/db'
import type * as schema from '../../../../db/schema'
import { enrichmentCompany } from '../../../../db/schema/enrichment'
import type { CompanyMatchResult } from '../../../../external/pappers/enhanced_search'
import type { InternationalCompanyResponse } from '../../../../external/pappers/international_company_v1'

/**
 * Pure query function to insert the main enrichment company record
 * This function only handles database operations without any business logic
 */
export const insertEnrichmentCompanyCore = async (
  enrichmentId: string,
  companyData: InternationalCompanyResponse,
  bestMatch: CompanyMatchResult,
  tx?: PostgresJsDatabase<typeof schema>,
): Promise<string> => {
  const dbOrTx = tx ?? db

  // Check if company already exists for this enrichment
  const [existingCompany] = await dbOrTx
    .select({ id: enrichmentCompany.id })
    .from(enrichmentCompany)
    .where(eq(enrichmentCompany.enrichment_id, enrichmentId))
    .limit(1)

  // If exists, delete all related data first (cascade will handle this automatically)
  if (existingCompany) {
    await dbOrTx
      .delete(enrichmentCompany)
      .where(eq(enrichmentCompany.id, existingCompany.id))
  }

  // Insert main company record
  const [insertedCompany] = await dbOrTx
    .insert(enrichmentCompany)
    .values({
      enrichment_id: enrichmentId,
      company_number: companyData.company_number,
      country_code: companyData.country_code,
      country: companyData.country,
      state: companyData.state,
      vat_number: companyData.vat_number,
      name: companyData.name,
      trade_name: companyData.trade_name,
      acronym: companyData.acronym,
      legal_form_code: companyData.legal_form_code,
      local_legal_form_code: companyData.local_legal_form_code,
      local_legal_form_name: companyData.local_legal_form_name,
      type: companyData.type,
      status: companyData.status,
      date_of_creation: companyData.date_of_creation
        ? new Date(companyData.date_of_creation)
        : null,
      date_of_cessation: companyData.date_of_cessation
        ? new Date(companyData.date_of_cessation)
        : null,
      workforce: companyData.workforce,
      workforce_range: companyData.workforce_range,
      // Head office address
      head_office_address_line_1: companyData.head_office?.address_line_1,
      head_office_address_line_2: companyData.head_office?.address_line_2,
      head_office_postal_code: companyData.head_office?.postal_code,
      head_office_city: companyData.head_office?.city,
      head_office_country: companyData.head_office?.country,
      head_office_country_code: companyData.head_office?.country_code,
      // Commercial register
      commercial_register_registration_status:
        companyData.commercial_register_registration_status,
      commercial_register_registration_location:
        companyData.commercial_register_registration_location,
      commercial_register_registration_date:
        companyData.commercial_register_registration_date
          ? new Date(companyData.commercial_register_registration_date)
          : null,
      commercial_register_cessation_date:
        companyData.commercial_register_cessation_date
          ? new Date(companyData.commercial_register_cessation_date)
          : null,
      // Financial information
      share_capital: companyData.share_capital?.toString(),
      share_capital_currency: companyData.share_capital_currency,
      fiscal_year_end: companyData.fiscal_year_end,
      next_fiscal_year_end: companyData.next_fiscal_year_end,
      fields_of_activity: companyData.fields_of_activity
        ? JSON.stringify(companyData.fields_of_activity)
        : null,
      reasoning: bestMatch.reasoning,
      confidence_score: Math.round(bestMatch.confidence),
    })
    .returning()

  return insertedCompany.id
}
