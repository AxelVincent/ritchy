import { db } from '../../../../db/db'
import { enrichment as enrichmentTable } from '../../../../db/schema'

export interface EnrichmentUpsertResult {
  id: string
  placeId: string
}

/**
 * Batch insert or update enrichment records with companyStatus='queued'.
 * Uses onConflictDoUpdate to handle existing records.
 *
 * @param placeIds - Array of place IDs to create/update enrichments for
 * @returns Array of enrichment records with id and placeId
 */
export const upsertEnrichmentsBatch = async (
  placeIds: string[],
): Promise<EnrichmentUpsertResult[]> => {
  if (placeIds.length === 0) return []

  return db
    .insert(enrichmentTable)
    .values(
      placeIds.map((placeId) => ({
        placeId,
        companyStatus: 'queued' as const,
      })),
    )
    .onConflictDoUpdate({
      target: enrichmentTable.placeId,
      set: { companyStatus: 'queued' },
    })
    .returning({
      id: enrichmentTable.id,
      placeId: enrichmentTable.placeId,
    })
}
