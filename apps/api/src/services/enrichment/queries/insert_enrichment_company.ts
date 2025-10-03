import { logger } from '@ritchy/logger'
import { eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { db } from '../../../db/db'
import type * as schema from '../../../db/schema'
import {
  enrichmentCompany,
  enrichmentCompanyActivity,
  enrichmentCompanyContact,
  enrichmentCompanyEstablishment,
  enrichmentCompanyFinancial,
  enrichmentCompanyOfficer,
  enrichmentCompanyUbo,
} from '../../../db/schema/enrichment'
import type { CompanyMatchResult } from '../../../external/pappers/enhanced_search'
import type { InternationalCompanyResponse } from '../../../external/pappers/international_company_v1'

export const insertEnrichmentCompany = async (
  enrichmentId: string,
  companyData: InternationalCompanyResponse,
  bestMatch: CompanyMatchResult,
  tx?: PostgresJsDatabase<typeof schema>,
): Promise<void> => {
  const dbOrTx = tx ?? db

  try {
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

    const companyId = insertedCompany.id

    // Insert activities if present
    if (companyData.activities?.length) {
      await dbOrTx.insert(enrichmentCompanyActivity).values(
        companyData.activities.map((activity) => ({
          company_id: companyId,
          code: activity.code,
          name: activity.name,
          type: 'standard',
        })),
      )
    }

    // Insert local activities if present
    if (companyData.local_activities?.length) {
      await dbOrTx.insert(enrichmentCompanyActivity).values(
        companyData.local_activities.map((activity) => ({
          company_id: companyId,
          code: activity.code,
          name: activity.name,
          type: 'local',
          classification: activity.classification,
        })),
      )
    }

    // Insert officers if present
    if (companyData.officers?.length) {
      await dbOrTx.insert(enrichmentCompanyOfficer).values(
        companyData.officers.map((officer) => ({
          company_id: companyId,
          type: officer.type,
          role: officer.role,
          mention: officer.mention,
          date_of_appointment: officer.date_of_appointment
            ? new Date(officer.date_of_appointment)
            : null,
          last_name: officer.last_name,
          first_name: officer.first_name,
          gender: officer.gender,
          date_of_birth: officer.date_of_birth
            ? new Date(officer.date_of_birth)
            : null,
          date_of_birth_format: officer.date_of_birth_format,
          nationality: officer.nationality,
          nationality_code: officer.nationality_code,
          company_name: officer.company_name,
          company_number: officer.company_number,
          address_line_1: officer.address_line_1,
          address_line_2: officer.address_line_2,
          postal_code: officer.postal_code,
          city: officer.city,
          country: officer.country,
          country_code: officer.country_code,
        })),
      )
    }

    // Insert UBOs if present
    if (companyData.ubos?.length) {
      await dbOrTx.insert(enrichmentCompanyUbo).values(
        companyData.ubos.map((ubo) => ({
          company_id: companyId,
          last_name: ubo.last_name,
          first_name: ubo.first_name,
          gender: ubo.gender,
          date_of_birth: ubo.date_of_birth ? new Date(ubo.date_of_birth) : null,
          date_of_birth_format: ubo.date_of_birth_format,
          nationality: ubo.nationality,
          nationality_code: ubo.nationality_code,
          address_line_1: ubo.address_line_1,
          address_line_2: ubo.address_line_2,
          postal_code: ubo.postal_code,
          city: ubo.city,
          country: ubo.country,
          country_code: ubo.country_code,
          percentage_of_shares: ubo.percentage_of_shares?.toString(),
          voting_percentage: ubo.voting_percentage?.toString(),
        })),
      )
    }

    // Insert contacts if present
    if (companyData.contacts?.length) {
      await dbOrTx.insert(enrichmentCompanyContact).values(
        companyData.contacts.map((contact) => ({
          company_id: companyId,
          type: contact.type,
          value: contact.value ?? '',
        })),
      )
    }

    // Insert establishments if present
    if (companyData.establishments?.length) {
      await dbOrTx.insert(enrichmentCompanyEstablishment).values(
        companyData.establishments.map((establishment) => ({
          company_id: companyId,
          number: establishment.number,
          name: establishment.name,
          trade_name: establishment.trade_name,
          acronym: establishment.acronym,
          fields_of_activity: establishment.fields_of_activity
            ? JSON.stringify(establishment.fields_of_activity)
            : null,
          date_of_creation: establishment.date_of_creation
            ? new Date(establishment.date_of_creation)
            : null,
          status: establishment.status,
          date_of_cessation: establishment.date_of_cessation
            ? new Date(establishment.date_of_cessation)
            : null,
          address_line_1: establishment.address_line_1,
          address_line_2: establishment.address_line_2,
          postal_code: establishment.postal_code,
          city: establishment.city,
          country: establishment.country,
          country_code: establishment.country_code,
        })),
      )
    }

    // Insert financials if present
    if (companyData.financials?.length) {
      await dbOrTx.insert(enrichmentCompanyFinancial).values(
        companyData.financials.map((financial) => ({
          company_id: companyId,
          type: financial.type,
          financials_start_date: financial.financials_start_date
            ? new Date(financial.financials_start_date)
            : null,
          financials_end_date: financial.financials_end_date
            ? new Date(financial.financials_end_date)
            : null,
          deposit_date: financial.deposit_date
            ? new Date(financial.deposit_date)
            : null,
          currency: financial.currency,
          availability: financial.availability,
          ratios: financial.ratios || null,
          related_documents: financial.related_documents || null,
        })),
      )
    }

    logger.info({
      msg: 'Enrichment company data inserted successfully',
      event: 'enrichment_company_inserted',
      metadata: {
        enrichmentId,
        companyId,
        companyNumber: companyData.company_number,
        companyName: companyData.name,
        activitiesCount: companyData.activities?.length ?? 0,
        localActivitiesCount: companyData.local_activities?.length ?? 0,
        officersCount: companyData.officers?.length ?? 0,
        ubosCount: companyData.ubos?.length ?? 0,
        contactsCount: companyData.contacts?.length ?? 0,
        establishmentsCount: companyData.establishments?.length ?? 0,
      },
    })
  } catch (error) {
    logger.error({
      msg: 'Failed to insert enrichment company data',
      event: 'enrichment_company_insert_error',
      metadata: {
        enrichmentId,
        companyNumber: companyData.company_number,
        error: error instanceof Error ? error.message : String(error),
      },
    })
    throw error
  }
}
