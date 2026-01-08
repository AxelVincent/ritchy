import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { db } from '../../../../db/db'
import type * as schema from '../../../../db/schema'
import { enrichmentCompanyEstablishment } from '../../../../db/schema/enrichment'
import type { InternationalCompanyResponse } from '../../../../external/pappers/international_company_v1'

type Establishment = NonNullable<
  InternationalCompanyResponse['establishments']
>[number]

/**
 * Pure query function to insert company establishments
 */
export const insertEnrichmentCompanyEstablishments = async (
  companyId: string,
  establishments: Establishment[] | null | undefined,
  tx?: PostgresJsDatabase<typeof schema>,
): Promise<void> => {
  const dbOrTx = tx ?? db

  if (!establishments?.length) {
    return
  }

  await dbOrTx.insert(enrichmentCompanyEstablishment).values(
    establishments.map((establishment) => ({
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
