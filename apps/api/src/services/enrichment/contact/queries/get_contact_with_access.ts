import { and, eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { db } from '../../../../db/db'
import type * as schema from '../../../../db/schema'
import { contact, enrichment, userPlace } from '../../../../db/schema'

export interface ContactWithAccess {
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
  /** Legacy enrichment success flag (for backwards compatibility) */
  legacySuccess: boolean | null
  userPlaceId: string
}

/**
 * Get contact with access verification.
 * Ensures the user has access to the contact through the userPlace relationship.
 *
 * @param contactId - The contact ID to fetch
 * @param userId - The user ID to verify access
 * @param tx - Optional database transaction
 * @returns Contact data with access info, or null if not found/no access
 */
export const getContactWithAccess = async (
  contactId: string,
  userId: string,
  tx?: PostgresJsDatabase<typeof schema>,
): Promise<ContactWithAccess | null> => {
  const database = tx ?? db

  const result = await database
    .select({
      id: contact.id,
      enrichmentStatus: contact.enrichmentStatus,
      companyStatus: enrichment.companyStatus,
      legacySuccess: enrichment.success,
      userPlaceId: userPlace.id,
    })
    .from(contact)
    .innerJoin(userPlace, eq(userPlace.id, contact.userPlaceId))
    .innerJoin(enrichment, eq(enrichment.placeId, userPlace.place_id))
    .where(and(eq(contact.id, contactId), eq(userPlace.user_id, userId)))
    .limit(1)

  return result[0] ?? null
}
