import { logger } from '@ritchy/logger'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { db } from '../../../../db/db'
import type * as schema from '../../../../db/schema'
import { enrichmentCompanyOfficerPhone } from '../../../../db/schema/enrichment'

export interface InsertOfficerPhoneData {
  readonly officer_id: string
  readonly phone: string
  readonly source: string
}

/**
 * Insert phone numbers for an enrichment company officer
 * Uses INSERT ... ON CONFLICT DO UPDATE to handle duplicates
 * @param phonesData Array of phone data to insert
 * @param tx Optional database transaction
 * @returns Array of inserted phone records
 */
export const insertEnrichmentCompanyOfficerPhones = async (
  phonesData: readonly InsertOfficerPhoneData[],
  tx?: PostgresJsDatabase<typeof schema>,
) => {
  if (phonesData.length === 0) {
    logger.debug({
      msg: '[insert_enrichment_company_officer_phones] No phone data to insert',
      event: 'insert_officer_phones_empty',
    })
    return []
  }

  const database = tx || db

  try {
    const insertedPhones = await database
      .insert(enrichmentCompanyOfficerPhone)
      .values(
        phonesData.map((phoneData) => ({
          officer_id: phoneData.officer_id,
          phone: phoneData.phone,
          source: phoneData.source,
        })),
      )
      .onConflictDoUpdate({
        target: [
          enrichmentCompanyOfficerPhone.officer_id,
          enrichmentCompanyOfficerPhone.phone,
        ],
        set: {
          source: enrichmentCompanyOfficerPhone.source,
          updatedAt: new Date(),
        },
      })
      .returning()

    logger.info({
      msg: '[insert_enrichment_company_officer_phones] Officer phones inserted successfully',
      event: 'insert_officer_phones_success',
      metadata: {
        phonesCount: insertedPhones.length,
        officerIds: Array.from(new Set(phonesData.map((p) => p.officer_id))),
      },
    })

    return insertedPhones
  } catch (error) {
    logger.error({
      msg: '[insert_enrichment_company_officer_phones] Failed to insert officer phones',
      event: 'insert_officer_phones_error',
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        phonesCount: phonesData.length,
      },
    })
    throw error
  }
}
