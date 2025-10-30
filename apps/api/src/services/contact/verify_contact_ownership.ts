import { and, eq } from 'drizzle-orm'
import { db } from '../../db/db'
import { contact, userPlace } from '../../db/schema'

export const verifyContactOwnership = async (
  contactId: string,
  userId: string,
): Promise<boolean> => {
  const result = await db
    .select({ id: contact.id })
    .from(contact)
    .innerJoin(userPlace, eq(contact.userPlaceId, userPlace.id))
    .where(and(eq(contact.id, contactId), eq(userPlace.user_id, userId)))
    .limit(1)

  return result.length > 0
}
