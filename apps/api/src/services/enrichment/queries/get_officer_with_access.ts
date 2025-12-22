import { and, eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { db } from '../../../db/db'
import type * as schema from '../../../db/schema'
import {
  enrichment,
  enrichmentCompany,
  enrichmentCompanyOfficer,
  userPlace,
} from '../../../db/schema'

export interface OfficerWithAccess {
  id: string
  enrichmentStatus:
    | 'idle'
    | 'queued'
    | 'processing'
    | 'completed'
    | 'failed'
    | null
  companyStatus:
    | 'idle'
    | 'queued'
    | 'processing'
    | 'completed'
    | 'failed'
    | null
  userPlaceId: string
}

/**
 * Get officer with access verification.
 * Ensures the user has access to the officer through the userPlace relationship.
 *
 * @param officerId - The officer ID to fetch
 * @param userId - The user ID to verify access
 * @param tx - Optional database transaction
 * @returns Officer data with access info, or null if not found/no access
 */
export const getOfficerWithAccess = async (
  officerId: string,
  userId: string,
  tx?: PostgresJsDatabase<typeof schema>,
): Promise<OfficerWithAccess | null> => {
  const database = tx ?? db

  const result = await database
    .select({
      id: enrichmentCompanyOfficer.id,
      enrichmentStatus: enrichmentCompanyOfficer.enrichmentStatus,
      companyStatus: enrichment.companyStatus,
      userPlaceId: userPlace.id,
    })
    .from(enrichmentCompanyOfficer)
    .innerJoin(
      enrichmentCompany,
      eq(enrichmentCompany.id, enrichmentCompanyOfficer.company_id),
    )
    .innerJoin(enrichment, eq(enrichment.id, enrichmentCompany.enrichment_id))
    .innerJoin(userPlace, eq(userPlace.place_id, enrichment.placeId))
    .where(
      and(
        eq(enrichmentCompanyOfficer.id, officerId),
        eq(userPlace.user_id, userId),
      ),
    )
    .limit(1)

  return result[0] ?? null
}
