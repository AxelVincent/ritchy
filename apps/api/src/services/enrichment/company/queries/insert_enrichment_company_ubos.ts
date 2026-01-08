import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { db } from '../../../../db/db'
import type * as schema from '../../../../db/schema'
import { enrichmentCompanyUbo } from '../../../../db/schema/enrichment'
import type { InternationalCompanyResponse } from '../../../../external/pappers/international_company_v1'

type Ubo = NonNullable<InternationalCompanyResponse['ubos']>[number]

/**
 * Pure query function to insert company UBOs (Ultimate Beneficial Owners)
 */
export const insertEnrichmentCompanyUbos = async (
  companyId: string,
  ubos: Ubo[] | null | undefined,
  tx?: PostgresJsDatabase<typeof schema>,
): Promise<void> => {
  const dbOrTx = tx ?? db

  if (!ubos?.length) {
    return
  }

  await dbOrTx.insert(enrichmentCompanyUbo).values(
    ubos.map((ubo) => ({
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
