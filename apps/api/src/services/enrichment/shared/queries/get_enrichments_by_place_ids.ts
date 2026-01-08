import { inArray } from 'drizzle-orm'
import { db } from '../../../../db/db'
import { enrichment as enrichmentTable } from '../../../../db/schema'

export interface EnrichmentStatusRecord {
  id: string
  placeId: string
  companyStatus: string | null
}

/**
 * Batch fetch enrichment records by placeIds.
 *
 * @param placeIds - Array of place IDs to fetch enrichments for
 * @returns Array of enrichment records with id, placeId, and companyStatus
 */
export const getEnrichmentsByPlaceIds = async (
  placeIds: string[],
): Promise<EnrichmentStatusRecord[]> => {
  if (placeIds.length === 0) return []

  return db
    .select({
      id: enrichmentTable.id,
      placeId: enrichmentTable.placeId,
      companyStatus: enrichmentTable.companyStatus,
    })
    .from(enrichmentTable)
    .where(inArray(enrichmentTable.placeId, placeIds))
}
