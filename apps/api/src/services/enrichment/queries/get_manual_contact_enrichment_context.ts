import { eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { db } from '../../../db/db'
import type * as schema from '../../../db/schema'
import { contact, place, userPlace } from '../../../db/schema'

export interface ManualContactEnrichmentContext {
  contact: {
    id: string
    firstName: string | null
    lastName: string | null
    enrichmentStatus: string | null
    linkedinUrl: string | null
  }
  place: {
    website: string | null
    name: string | null
  }
  userPlaceId: string
}

/**
 * Get enrichment context for a manual (user-created) contact.
 * Returns null if contact has an officerId (is an officer contact).
 */
export const getManualContactEnrichmentContext = async (
  contactId: string,
  tx?: PostgresJsDatabase<typeof schema>,
): Promise<ManualContactEnrichmentContext | null> => {
  const database = tx ?? db

  const result = await database
    .select({
      contact: {
        id: contact.id,
        firstName: contact.firstName,
        lastName: contact.lastName,
        officerId: contact.officerId,
        enrichmentStatus: contact.enrichmentStatus,
        linkedinUrl: contact.linkedinUrl,
      },
      userPlaceId: userPlace.id,
      place: {
        website: place.website,
        name: place.name,
      },
    })
    .from(contact)
    .innerJoin(userPlace, eq(userPlace.id, contact.userPlaceId))
    .innerJoin(place, eq(place.id, userPlace.place_id))
    .where(eq(contact.id, contactId))
    .limit(1)

  if (!result.length) {
    return null
  }

  // Only for manual contacts (no officerId)
  if (result[0].contact.officerId) {
    return null
  }

  return {
    contact: {
      id: result[0].contact.id,
      firstName: result[0].contact.firstName,
      lastName: result[0].contact.lastName,
      enrichmentStatus: result[0].contact.enrichmentStatus,
      linkedinUrl: result[0].contact.linkedinUrl,
    },
    place: result[0].place,
    userPlaceId: result[0].userPlaceId,
  }
}
