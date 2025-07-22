import { and, eq } from 'drizzle-orm'
import { db } from '../../db/db'
import { contact } from '../../db/schema'
import { getPlaceDetailsV1 } from '../../external/google_maps/place_details_V1'

export const fetchOrCreateContact = async (
  userPlaceId: string,
  userId: string
) => {
  const [existingContact] = await db
    .select()
    .from(contact)
    .where(
      and(eq(contact.userPlaceId, userPlaceId), eq(contact.userPlaceId, userId))
    )

  if (!existingContact) {
    const place = await getPlaceDetailsV1(userPlaceId)
    const [newContact] = await db
      .insert(contact)
      .values({
        userPlaceId,
        firstName: '',
        lastName: place.name
      })
      .returning()

    return newContact
  }

  return existingContact
}

export const fetchOrCreateContacts = async (
  placeIds: string[],
  userId: string
) =>
  Promise.all(
    placeIds.map(async (placeId) => await fetchOrCreateContact(placeId, userId))
  )
