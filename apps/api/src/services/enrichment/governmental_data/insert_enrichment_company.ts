import { logger } from '@ritchy/logger'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { db } from '../../../db/db'
import type * as schema from '../../../db/schema'
import type { CompanyMatchResult } from '../../../external/pappers/enhanced_search'
import type { InternationalCompanyResponse } from '../../../external/pappers/international_company_v1'
import { getPlaceByEnrichmentId } from '../../places/queries/get_place_by_enrichment_id'
import { insertEnrichmentCompanyActivities } from '../queries/insert_enrichment_company_activities'
import { insertEnrichmentCompanyContacts } from '../queries/insert_enrichment_company_contacts'
import { insertEnrichmentCompanyCore } from '../queries/insert_enrichment_company_core'
import { insertEnrichmentCompanyEstablishments } from '../queries/insert_enrichment_company_establishments'
import { insertEnrichmentCompanyFinancials } from '../queries/insert_enrichment_company_financials'
import { insertEnrichmentCompanyOfficers } from '../queries/insert_enrichment_company_officers'
import { insertEnrichmentCompanyUbos } from '../queries/insert_enrichment_company_ubos'
import type { EnrichmentContext } from '../status_builder'
import { enrichCompanyOfficers } from './enrich_company_officers'

/**
 * Main service function to insert enrichment company data with all related entities
 *
 * This function orchestrates:
 * 1. Core company data insertion (within transaction)
 * 2. Related data insertion (activities, contacts, UBOs, etc.) (within transaction)
 * 3. Officer enrichment with external email search (AFTER transaction commits)
 *
 * The separation ensures that slow external API calls don't hold database locks.
 *
 * @param enrichmentId - The enrichment ID to associate the company with
 * @param companyData - Company data from Pappers API
 * @param bestMatch - Match confidence and reasoning from search
 * @param context - Optional enrichment context for status tracking
 */
export const insertEnrichmentCompany = async (
  enrichmentId: string,
  companyData: InternationalCompanyResponse,
  bestMatch: CompanyMatchResult,
  tx?: PostgresJsDatabase<typeof schema>,
): Promise<void> => {
  try {
    // Use transaction for core data to ensure atomicity
    const companyId = await db.transaction(async (txInner) => {
      const transactionToUse = tx ?? txInner

      // Insert core company record
      const companyId = await insertEnrichmentCompanyCore(
        enrichmentId,
        companyData,
        bestMatch,
        transactionToUse,
      )

      // Insert all related data in parallel within transaction
      await Promise.all([
        insertEnrichmentCompanyActivities(
          companyId,
          companyData.activities,
          companyData.local_activities,
          transactionToUse,
        ),
        insertEnrichmentCompanyContacts(
          companyId,
          companyData.contacts,
          transactionToUse,
        ),
        insertEnrichmentCompanyUbos(
          companyId,
          companyData.ubos,
          transactionToUse,
        ),
        insertEnrichmentCompanyEstablishments(
          companyId,
          companyData.establishments,
          transactionToUse,
        ),
        insertEnrichmentCompanyFinancials(
          companyId,
          companyData.financials,
          transactionToUse,
        ),
        insertEnrichmentCompanyOfficers(
          companyId,
          companyData.officers,
          transactionToUse,
        ),
      ])

      return companyId
    })

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
        financialsCount: companyData.financials?.length ?? 0,
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
