import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { db } from '../../../db/db'
import type * as schema from '../../../db/schema'
import { enrichmentCompanyFinancial } from '../../../db/schema/enrichment'
import type { InternationalCompanyResponse } from '../../../external/pappers/international_company_v1'

type Financial = NonNullable<InternationalCompanyResponse['financials']>[number]

/**
 * Pure query function to insert company financials
 */
export const insertEnrichmentCompanyFinancials = async (
  companyId: string,
  financials: Financial[] | null | undefined,
  tx?: PostgresJsDatabase<typeof schema>,
): Promise<void> => {
  const dbOrTx = tx ?? db

  if (!financials?.length) {
    return
  }

  await dbOrTx.insert(enrichmentCompanyFinancial).values(
    financials.map((financial) => ({
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
