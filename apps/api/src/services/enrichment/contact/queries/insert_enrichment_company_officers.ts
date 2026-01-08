import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { db } from '../../../../db/db'
import type * as schema from '../../../../db/schema'
import { enrichmentCompanyOfficer } from '../../../../db/schema/enrichment'
import type { InternationalCompanyResponse } from '../../../../external/pappers/international_company_v1'

/**
 * Pure query function to insert a single company officer
 * Returns the inserted officer ID for further enrichment
 */
export const insertEnrichmentCompanyOfficers = async (
  companyId: string,
  officers: InternationalCompanyResponse['officers'],
  tx?: PostgresJsDatabase<typeof schema>,
): Promise<void> => {
  const dbOrTx = tx ?? db

  if (!officers?.length) {
    return
  }

  await dbOrTx
    .insert(enrichmentCompanyOfficer)
    .values(
      officers.map((officer) => ({
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
    .returning({ id: enrichmentCompanyOfficer.id })
}
