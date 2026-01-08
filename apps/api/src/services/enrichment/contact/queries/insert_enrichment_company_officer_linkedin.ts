import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { db } from '../../../../db/db'
import { enrichmentCompanyOfficerLinkedin } from '../../../../db/schema'
import type * as schema from '../../../../db/schema'

export interface InsertOfficerLinkedInData {
  officer_id: string
  profile_url: string
  confidence: number
  reasoning?: string | null
  source: string
}

export const insertEnrichmentCompanyOfficerLinkedIn = async (
  data: InsertOfficerLinkedInData | InsertOfficerLinkedInData[],
  tx?: PostgresJsDatabase<typeof schema>,
) => {
  const dbOrTx = tx ?? db
  const dataArray = Array.isArray(data) ? data : [data]

  if (dataArray.length === 0) {
    return []
  }

  const result = await dbOrTx
    .insert(enrichmentCompanyOfficerLinkedin)
    .values(dataArray)
    .onConflictDoNothing()
    .returning()

  return result
}
